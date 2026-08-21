import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AppNotification } from '../../../../shared/models/notification.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { NotificationService } from './notification.service';

const BASE_URL = `${environment.apiUrl}/v1/Notifications`;

const notification: AppNotification = {
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

describe('NotificationService', () => {
    let service: NotificationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(NotificationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('reportIncident()', () => {
        it('POSTs to ReportIncident with the message and resolves the real recipient count', () => {
            let result: OperationResult<number> | undefined;

            service.reportIncident('Hay una fuga en la válvula 3').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/ReportIncident`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({ message: 'Hay una fuga en la válvula 3' });
            req.flush({ data: 2, isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 2 });
        });

        it('resolves 0 recipients as success (nobody to notify is not an error)', () => {
            let result: OperationResult<number> | undefined;

            service.reportIncident('Aviso menor').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/ReportIncident`).flush({ data: 0, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 0 });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<number> | undefined;

            service.reportIncident('').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/ReportIncident`).flush({ isSuccess: false, message: 'El campo Message es obligatorio.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El campo Message es obligatorio.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<number> | undefined;

            service.reportIncident('x').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/ReportIncident`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('send()', () => {
        it('POSTs to Send with audience Organization and the fixed title/type, without a targetWalkwayId', () => {
            let result: OperationResult<number> | undefined;

            service.send('Corte de agua programado mañana', 'Organization').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Send`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual({
                audience: 'Organization',
                title: 'Aviso de tu comunidad',
                message: 'Corte de agua programado mañana',
                type: 'Info'
            });
            req.flush({ data: 42, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 42 });
        });

        it('POSTs to Send with audience Walkway and the targetWalkwayId', () => {
            let result: OperationResult<number> | undefined;

            service.send('Corte de agua en este andador', 'Walkway', 'walkway-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Send`);
            expect(req.request.body).toEqual({
                audience: 'Walkway',
                title: 'Aviso de tu comunidad',
                message: 'Corte de agua en este andador',
                type: 'Info',
                targetWalkwayId: 'walkway-1'
            });
            req.flush({ data: 8, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 8 });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<number> | undefined;

            service.send('', 'Organization').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Send`).flush({ isSuccess: false, message: 'El campo Message es obligatorio.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El campo Message es obligatorio.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<number> | undefined;

            service.send('x', 'Organization').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Send`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('listMine()', () => {
        it('sends PageNumber/PageSize/UnreadOnly and maps a successful page', () => {
            let result: ListResult<AppNotification> | undefined;

            service.listMine(1, 10, false).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            expect(req.request.params.get('UnreadOnly')).toBe('false');
            req.flush({ data: [notification], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [notification], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<AppNotification> | undefined;

            service.listMine().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<AppNotification> | undefined;

            service.listMine().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('markAsRead()', () => {
        it('PUTs to MarkAsRead/{id} with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.markAsRead('notification-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/MarkAsRead/notification-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on an ownership failure (notificación ajena), resolves with the real backend message -- the backend returns HTTP 200 with isSuccess:false here, not a 404', () => {
            let result: OperationResult<boolean> | undefined;

            service.markAsRead('notification-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/MarkAsRead/notification-1`).flush({ isSuccess: false, message: 'No se encontró la notificación con el id notification-1.' });

            expect(result?.isSuccess).toBe(false);
            expect(result?.message).toBe('No se encontró la notificación con el id notification-1.');
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.markAsRead('notification-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/MarkAsRead/notification-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('markAllAsRead()', () => {
        it('PUTs to MarkAllAsRead with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.markAllAsRead().subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/MarkAllAsRead`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'Notificaciones marcadas como leídas.' });

            expect(result).toEqual({ isSuccess: true, message: 'Notificaciones marcadas como leídas.', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.markAllAsRead().subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/MarkAllAsRead`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
