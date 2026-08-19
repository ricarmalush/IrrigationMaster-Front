import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { WalkwayService } from '../../services/walkway.service';

@Component({
    selector: 'app-walkway-list',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule],
    templateUrl: './walkway-list.component.html'
})
export class WalkwayListComponent {
    private walkwayService = inject(WalkwayService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly walkways = signal<Walkway[]>([]);
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

    confirmDelete(walkway: Walkway): void {
        this.confirmationService.confirm({
            header: 'Confirmar eliminación',
            message: `¿Eliminar la pasarela "${walkway.code}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(walkway)
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.walkwayService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.walkways.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private delete(walkway: Walkway): void {
        this.walkwayService.delete(walkway.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Pasarela eliminada' : 'No se pudo eliminar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
