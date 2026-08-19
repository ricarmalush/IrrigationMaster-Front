import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { Organization } from '../../../../../shared/models/organization.model';
import { OrganizationService } from '../../services/organization.service';

@Component({
    selector: 'app-organization-list',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule],
    templateUrl: './organization-list.component.html'
})
export class OrganizationListComponent {
    private organizationService = inject(OrganizationService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';

    readonly organizations = signal<Organization[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);

    private lastFirst = 0;
    private lastRows = 10;

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    confirmDelete(organization: Organization): void {
        this.confirmationService.confirm({
            header: 'Confirmar eliminación',
            message: `¿Eliminar la organización "${organization.name}"? Podrás restaurarla después.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(organization)
        });
    }

    confirmRestore(organization: Organization): void {
        this.confirmationService.confirm({
            header: 'Confirmar restauración',
            message: `¿Restaurar la organización "${organization.name}"?`,
            icon: 'pi pi-question-circle',
            accept: () => this.restore(organization)
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.organizationService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.organizations.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private delete(organization: Organization): void {
        this.organizationService.delete(organization.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Organización eliminada' : 'No se pudo eliminar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    private restore(organization: Organization): void {
        this.organizationService.restore(organization.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Organización restaurada' : 'No se pudo restaurar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
