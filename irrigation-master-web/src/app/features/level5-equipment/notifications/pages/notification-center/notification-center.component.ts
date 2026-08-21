import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { AppNotification, NotificationType } from '../../../../../shared/models/notification.model';
import { NotificationService } from '../../services/notification.service';

const TYPE_LABELS: Record<NotificationType, string> = {
    Alert: 'Alerta',
    Info: 'Info',
    Billing: 'Facturación',
    System: 'Sistema'
};

const TYPE_SEVERITIES: Record<NotificationType, 'danger' | 'info' | 'warn' | 'secondary'> = {
    Alert: 'danger',
    Info: 'info',
    Billing: 'warn',
    System: 'secondary'
};

@Component({
    selector: 'app-notification-center',
    standalone: true,
    imports: [TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DatePipe],
    templateUrl: './notification-center.component.html'
})
export class NotificationCenterComponent {
    private notificationService = inject(NotificationService);
    private messageService = inject(MessageService);

    readonly notifications = signal<AppNotification[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly markingAllAsRead = signal(false);

    private lastFirst = 0;
    private lastRows = 10;

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    typeLabel(type: NotificationType): string {
        return TYPE_LABELS[type];
    }

    typeSeverity(type: NotificationType): 'danger' | 'info' | 'warn' | 'secondary' {
        return TYPE_SEVERITIES[type];
    }

    // Espejo de SelectNotificationAsync en la App: tocar una notificación ya leída no hace nada.
    selectNotification(notification: AppNotification): void {
        if (notification.isRead) {
            return;
        }

        this.notificationService.markAsRead(notification.id).subscribe((result) => {
            if (result.isSuccess) {
                this.fetch();
            } else {
                this.messageService.add({ severity: 'error', summary: 'No se pudo marcar como leída', detail: result.message });
            }
        });
    }

    markAllAsRead(): void {
        this.markingAllAsRead.set(true);
        this.notificationService.markAllAsRead().subscribe((result) => {
            this.markingAllAsRead.set(false);
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Notificaciones actualizadas' : 'No se pudo completar la acción',
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

        // A diferencia de la App (que se traga los errores de carga en silencio), aquí sí los
        // mostramos -- mismo rigor que el resto de pantallas de este Front.
        this.notificationService.listMine(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.notifications.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
