import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../services/user.service';

interface ActiveFilterOption {
    label: string;
    value: boolean | null;
}

interface OrganizationFilterOption {
    label: string;
    value: string | null;
}

const ALL_ORGANIZATIONS_OPTION: OrganizationFilterOption = { label: 'Todas las organizaciones', value: null };

@Component({
    selector: 'app-user-list',
    standalone: true,
    imports: [RouterModule, FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, SelectModule],
    templateUrl: './user-list.component.html'
})
export class UserListComponent implements OnInit {
    private userService = inject(UserService);
    private organizationService = inject(OrganizationService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Mismo patrón ya usado en license-list/invoice-list: solo SUPERADMIN ve usuarios de todas
    // las organizaciones mezclados, así que solo SUPERADMIN necesita la columna/selector para
    // distinguirlos -- para cualquier otro rol, todos sus usuarios son de su propia organización.
    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';

    readonly users = signal<AppUser[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly activeFilterOptions: ActiveFilterOption[] = [
        { label: 'Todos', value: null },
        { label: 'Activos', value: true },
        { label: 'Pendientes de aprobación', value: false }
    ];
    readonly activeFilter = signal<boolean | null>(null);

    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);
    readonly organizationFilter = signal<string | null>(null);
    readonly organizationFilterOptions = computed<OrganizationFilterOption[]>(() => [ALL_ORGANIZATIONS_OPTION, ...this.organizations().map((o) => ({ label: o.name, value: o.id }))]);

    private lastFirst = 0;
    private lastRows = 10;

    ngOnInit(): void {
        if (!this.isSuperAdmin) {
            return;
        }

        this.organizationsLoading.set(true);
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationsLoading.set(false);
            this.organizations.set(result.items);
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    onActiveFilterChange(): void {
        this.lastFirst = 0;
        this.fetch();
    }

    onOrganizationFilterChange(): void {
        this.lastFirst = 0;
        this.fetch();
    }

    confirmDeactivate(user: AppUser): void {
        this.confirmationService.confirm({
            header: 'Confirmar desactivación',
            message: `¿Desactivar a "${user.fullName}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deactivate(user)
        });
    }

    activate(user: AppUser): void {
        this.userService.activate(user.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Usuario activado' : 'No se pudo activar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.userService.list(pageNumber, this.lastRows, this.activeFilter() ?? undefined, this.organizationFilter() ?? undefined).subscribe((result) => {
            this.loading.set(false);
            this.users.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private deactivate(user: AppUser): void {
        this.userService.delete(user.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Usuario desactivado' : 'No se pudo desactivar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
