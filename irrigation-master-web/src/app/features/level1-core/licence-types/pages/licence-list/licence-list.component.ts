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
import { LicenceType, SystemLevel } from '../../../../../shared/models/licence-type.model';
import { LicenceTypeService } from '../../services/licence-type.service';

const MAX_LEVEL_LABELS: Record<SystemLevel, string> = {
    Core: 'Core (Nivel 1)',
    Structure: 'Estructura (Nivel 2)',
    Planning: 'Planificación (Nivel 3)',
    Operational: 'Operacional (Nivel 4)',
    Administrative: 'Administrativo (Nivel 5)'
};

@Component({
    selector: 'app-licence-list',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule],
    templateUrl: './licence-list.component.html'
})
export class LicenceListComponent {
    private licenceTypeService = inject(LicenceTypeService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    // Create/Update/Delete son exclusivos de SUPERADMIN en el backend (LicenceTypeCatalogueController);
    // la lectura (list/getById) está abierta a cualquier autenticado, mismo patrón que Organizations.
    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';

    readonly licenceTypes = signal<LicenceType[]>([]);
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

    maxLevelLabel(licenceType: LicenceType): string {
        return MAX_LEVEL_LABELS[licenceType.maxLevelAllowed];
    }

    confirmDelete(licenceType: LicenceType): void {
        this.confirmationService.confirm({
            header: 'Confirmar eliminación',
            message: `¿Eliminar el tipo de licencia "${licenceType.name}"? Esta acción no se puede deshacer.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(licenceType)
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.licenceTypeService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.licenceTypes.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private delete(licenceType: LicenceType): void {
        this.licenceTypeService.delete(licenceType.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Tipo de licencia eliminado' : 'No se pudo eliminar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
