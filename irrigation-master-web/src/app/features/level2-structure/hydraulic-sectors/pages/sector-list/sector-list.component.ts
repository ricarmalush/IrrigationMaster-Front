import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { ToolbarModule } from 'primeng/toolbar';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';

@Component({
    selector: 'app-sector-list',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, ToolbarModule, MessageModule],
    templateUrl: './sector-list.component.html'
})
export class SectorListComponent {
    private sectorService = inject(HydraulicSectorService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly sectors = signal<HydraulicSector[]>([]);
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

    confirmDelete(sector: HydraulicSector): void {
        this.confirmationService.confirm({
            header: 'Confirmar eliminación',
            message: `¿Eliminar el sector "${sector.name}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(sector)
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.sectorService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.sectors.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private delete(sector: HydraulicSector): void {
        this.sectorService.delete(sector.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Sector eliminado' : 'No se pudo eliminar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
