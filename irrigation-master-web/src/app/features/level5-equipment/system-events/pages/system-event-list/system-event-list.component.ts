import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { SystemEvent, SystemEventType } from '../../../../../shared/models/system-event.model';
import { SystemEventService } from '../../services/system-event.service';

const EVENT_TYPE_LABELS: Record<SystemEventType, string> = {
    Startup: 'Arranque',
    Shutdown: 'Parada',
    ConfigurationChanged: 'Cambio de configuración',
    DataExported: 'Exportación de datos',
    AnomalyDetected: 'Anomalía detectada'
};

const EVENT_TYPE_SEVERITIES: Record<SystemEventType, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
    Startup: 'success',
    Shutdown: 'warn',
    ConfigurationChanged: 'info',
    DataExported: 'info',
    AnomalyDetected: 'danger'
};

@Component({
    selector: 'app-system-event-list',
    standalone: true,
    imports: [FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DatePickerModule, DatePipe],
    templateUrl: './system-event-list.component.html'
})
export class SystemEventListComponent {
    private systemEventService = inject(SystemEventService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    // Exclusivo SUPERADMIN, igual que en el backend: describe la plataforma completa, no una
    // organización -- ningún otro rol tiene motivo para verlo.
    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';

    readonly events = signal<SystemEvent[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly reportFromDate = signal<Date>(this.startOfCurrentMonth());
    readonly reportToDate = signal<Date>(new Date());
    readonly downloadingReport = signal(false);

    private lastFirst = 0;
    private lastRows = 10;

    typeLabel(event: SystemEvent): string {
        return EVENT_TYPE_LABELS[event.eventType] ?? event.eventType;
    }

    typeSeverity(event: SystemEvent): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        return EVENT_TYPE_SEVERITIES[event.eventType] ?? 'secondary';
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    downloadReport(): void {
        if (!this.isSuperAdmin) {
            return;
        }

        const from = this.toDateOnlyString(this.reportFromDate());
        const to = this.toDateOnlyString(this.reportToDate());

        this.downloadingReport.set(true);
        this.systemEventService.downloadReport(from, to).subscribe((result) => {
            this.downloadingReport.set(false);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo descargar el informe', detail: result.message });
                return;
            }

            this.triggerDownload(result.data, `eventos-sistema-${from}-${to}.pdf`);
        });
    }

    private triggerDownload(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }

    private startOfCurrentMonth(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    private toDateOnlyString(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }

    private fetch(): void {
        if (!this.isSuperAdmin) {
            return;
        }

        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.systemEventService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.events.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
