// Espejo de NotificationResponseDto (GET Notifications/Mine). Type llega como string -- el
// backend registra JsonStringEnumConverter globalmente.
export type NotificationType = 'Alert' | 'Info' | 'Billing' | 'System';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    readAt: string | null;
    userId: string;
    organizationId: string;
    created: string;
    createdBy: string;
}
