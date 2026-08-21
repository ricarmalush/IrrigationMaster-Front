import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { HolidayCalendar } from '../../../../../shared/models/holiday-calendar.model';
import { HolidayCalendarService } from '../../services/holiday-calendar.service';

@Component({
    selector: 'app-calendar-management',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DatePipe],
    templateUrl: './calendar-management.component.html'
})
export class CalendarManagementComponent {
    private holidayService = inject(HolidayCalendarService);
    private messageService = inject(MessageService);
    private confirmationService = inject(ConfirmationService);

    readonly holidays = signal<HolidayCalendar[]>([]);
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

    confirmDelete(holiday: HolidayCalendar): void {
        this.confirmationService.confirm({
            header: 'Confirmar eliminación',
            message: `¿Eliminar el festivo "${holiday.description}"?`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.delete(holiday)
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.holidayService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.holidays.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }

    private delete(holiday: HolidayCalendar): void {
        this.holidayService.delete(holiday.id).subscribe((result) => {
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Festivo eliminado' : 'No se pudo eliminar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }
}
