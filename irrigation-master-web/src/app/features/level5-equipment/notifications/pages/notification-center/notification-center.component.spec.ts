import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AppNotification } from '../../../../../shared/models/notification.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { NotificationService } from '../../services/notification.service';
import { NotificationCenterComponent } from './notification-center.component';

const unread: AppNotification = {
    id: 'notification-1',
    title: 'Corte de agua programado',
    message: 'Mañana no habrá suministro entre las 9:00 y las 13:00.',
    type: 'Info',
    isRead: false,
    readAt: null,
    userId: 'user-1',
    organizationId: 'org-1',
    created: '2026-08-20T10:00:00Z',
    createdBy: 'system'
};

const read: AppNotification = { ...unread, id: 'notification-2', isRead: true, readAt: '2026-08-20T11:00:00Z' };

describe('NotificationCenterComponent', () => {
    let component: NotificationCenterComponent;
    let fixture: ComponentFixture<NotificationCenterComponent>;
    let notificationService: jasmine.SpyObj<NotificationService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(): void {
        notificationService = jasmine.createSpyObj('NotificationService', ['listMine', 'markAsRead', 'markAllAsRead']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [NotificationCenterComponent],
            providers: [
                { provide: NotificationService, useValue: notificationService },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(NotificationCenterComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup();
        expect(component).toBeTruthy();
    });

    describe('typeLabel() / typeSeverity()', () => {
        beforeEach(() => setup());

        it('maps each NotificationType to its Spanish label', () => {
            expect(component.typeLabel('Alert')).toBe('Alerta');
            expect(component.typeLabel('Info')).toBe('Info');
            expect(component.typeLabel('Billing')).toBe('Facturación');
            expect(component.typeLabel('System')).toBe('Sistema');
        });

        it('maps each NotificationType to a p-tag severity', () => {
            expect(component.typeSeverity('Alert')).toBe('danger');
            expect(component.typeSeverity('Info')).toBe('info');
            expect(component.typeSeverity('Billing')).toBe('warn');
            expect(component.typeSeverity('System')).toBe('secondary');
        });
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup());

        it('loads a page and exposes the items/total on success', () => {
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: true, message: 'ok', items: [unread, read], totalCount: 2 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(notificationService.listMine).toHaveBeenCalledWith(1, 10);
            expect(component.notifications()).toEqual([unread, read]);
            expect(component.totalRecords()).toBe(2);
            expect(component.errorMessage()).toBeNull();
        });

        it('computes the correct page number from a non-zero "first"', () => {
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 20, rows: 10 });

            expect(notificationService.listMine).toHaveBeenCalledWith(3, 10);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.notifications()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure (a diferencia de la App, que lo ignora)', () => {
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.notifications()).toEqual([]);
        });
    });

    describe('selectNotification()', () => {
        beforeEach(() => {
            setup();
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        });

        it('does nothing when the notification is already read', () => {
            component.selectNotification(read);

            expect(notificationService.markAsRead).not.toHaveBeenCalled();
        });

        it('marks an unread notification as read and reloads the list on success', () => {
            notificationService.markAsRead.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.selectNotification(unread);

            expect(notificationService.markAsRead).toHaveBeenCalledWith('notification-1');
            expect(notificationService.listMine).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when marking as read fails', () => {
            notificationService.markAsRead.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se encontró la notificación.' }));

            component.selectNotification(unread);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se encontró la notificación.' }));
            expect(notificationService.listMine).not.toHaveBeenCalled();
        });
    });

    describe('markAllAsRead()', () => {
        beforeEach(() => setup());

        it('on success, shows a success toast and reloads the list', () => {
            notificationService.markAllAsRead.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Notificaciones marcadas como leídas.', data: true }));
            notificationService.listMine.and.returnValue(of<ListResult<AppNotification>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.markAllAsRead();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Notificaciones marcadas como leídas.' }));
            expect(notificationService.listMine).toHaveBeenCalled();
            expect(component.markingAllAsRead()).toBe(false);
        });

        it('on failure, shows an error toast and does not reload', () => {
            notificationService.markAllAsRead.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.' }));

            component.markAllAsRead();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
            expect(notificationService.listMine).not.toHaveBeenCalled();
        });
    });
});
