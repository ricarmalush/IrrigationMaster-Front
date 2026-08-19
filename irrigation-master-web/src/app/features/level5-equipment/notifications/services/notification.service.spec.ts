import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { OperationResult } from '../../../../shared/models/result.model';
import { NotificationService } from './notification.service';

const BASE_URL = `${environment.apiUrl}/v1/Notifications`;

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
});
