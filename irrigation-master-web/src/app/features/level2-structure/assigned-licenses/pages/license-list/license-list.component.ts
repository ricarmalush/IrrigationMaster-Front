import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { AssignedLicense } from '../../../../../shared/models/assigned-license.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { AssignedLicenseService } from '../../services/assigned-license.service';

type LicenseStatus = 'active' | 'expiredActive' | 'inactive' | 'expiredInactive';

const STATUS_LABELS: Record<LicenseStatus, string> = {
    active: 'Activa',
    expiredActive: 'Caducada (aún activa)',
    inactive: 'Desactivada',
    expiredInactive: 'Caducada y desactivada'
};

const STATUS_SEVERITIES: Record<LicenseStatus, 'success' | 'danger' | 'secondary'> = {
    active: 'success',
    expiredActive: 'danger',
    inactive: 'secondary',
    expiredInactive: 'secondary'
};

@Component({
    selector: 'app-license-list',
    standalone: true,
    imports: [RouterModule, FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DialogModule, InputNumberModule, DatePipe],
    templateUrl: './license-list.component.html'
})
export class LicenseListComponent implements OnInit {
    private licenseService = inject(AssignedLicenseService);
    private organizationService = inject(OrganizationService);
    private licenceTypeService = inject(LicenceTypeService);
    private userService = inject(UserService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    readonly canManage = this.currentSession.getRole() === 'SUPERADMIN';

    readonly licenses = signal<AssignedLicense[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly organizationNames = signal<Record<string, string>>({});
    readonly licenceTypeNames = signal<Record<string, string>>({});
    readonly userNames = signal<Record<string, string>>({});
    readonly actingId = signal<string | null>(null);

    readonly renewDialogVisible = signal(false);
    readonly renewExtraDays = signal(30);
    readonly renewing = signal(false);
    private renewingLicense: AssignedLicense | null = null;

    private lastFirst = 0;
    private lastRows = 10;

    ngOnInit(): void {
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationNames.set(Object.fromEntries(result.items.map((o) => [o.id, o.name])));
        });
        this.licenceTypeService.list(1, 100).subscribe((result) => {
            this.licenceTypeNames.set(Object.fromEntries(result.items.map((t) => [t.id, t.name])));
        });
        // Sin OrganizationId: para SUPERADMIN devuelve usuarios de todas las organizaciones, igual
        // que necesitamos aquí (las licencias individuales pueden ser de cualquier organización).
        this.userService.list(1, 100).subscribe((result) => {
            this.userNames.set(Object.fromEntries(result.items.map((u) => [u.id, u.fullName])));
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    organizationName(organizationId: string): string {
        return this.organizationNames()[organizationId] ?? organizationId;
    }

    licenceTypeName(licenceTypeId: string): string {
        return this.licenceTypeNames()[licenceTypeId] ?? licenceTypeId;
    }

    // Ámbito de la licencia: de organización (UserId null, cubre a todos sus vecinos) o
    // individual, acotada a un único usuario dentro de esa organización.
    scopeLabel(license: AssignedLicense): string {
        if (!license.userId) {
            return 'Organización';
        }
        return `Individual: ${this.userNames()[license.userId] ?? license.userId}`;
    }

    status(license: AssignedLicense): LicenseStatus {
        if (license.isActive) {
            return license.isExpired ? 'expiredActive' : 'active';
        }
        return license.isExpired ? 'expiredInactive' : 'inactive';
    }

    statusLabel(license: AssignedLicense): string {
        return STATUS_LABELS[this.status(license)];
    }

    statusSeverity(license: AssignedLicense): 'success' | 'danger' | 'secondary' {
        return STATUS_SEVERITIES[this.status(license)];
    }

    activate(license: AssignedLicense): void {
        if (!this.canManage) {
            return;
        }

        this.actingId.set(license.id);
        this.licenseService.activate(license.id).subscribe((result) => {
            this.actingId.set(null);
            this.notify(result, 'Licencia activada', 'No se pudo activar');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    deactivate(license: AssignedLicense): void {
        if (!this.canManage) {
            return;
        }

        this.actingId.set(license.id);
        this.licenseService.deactivate(license.id).subscribe((result) => {
            this.actingId.set(null);
            this.notify(result, 'Licencia desactivada', 'No se pudo desactivar');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    openRenewDialog(license: AssignedLicense): void {
        if (!this.canManage) {
            return;
        }

        this.renewingLicense = license;
        this.renewExtraDays.set(30);
        this.renewDialogVisible.set(true);
    }

    confirmRenew(): void {
        if (!this.renewingLicense) {
            return;
        }

        const license = this.renewingLicense;
        this.renewing.set(true);
        this.licenseService.renew({ id: license.id, extraDays: this.renewExtraDays() }).subscribe((result) => {
            this.renewing.set(false);
            this.notify(result, 'Licencia renovada', 'No se pudo renovar');
            if (result.isSuccess) {
                this.renewDialogVisible.set(false);
                this.fetch();
            }
        });
    }

    private notify(result: { isSuccess: boolean; message: string }, successSummary: string, failureSummary: string): void {
        this.messageService.add({
            severity: result.isSuccess ? 'success' : 'error',
            summary: result.isSuccess ? successSummary : failureSummary,
            detail: result.message
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.licenseService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.licenses.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
