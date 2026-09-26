import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { SystemEvent } from '../../../../shared/models/system-event.model';
import { SystemEventService } from './system-event.service';

const BASE_URL = `${environment.apiUrl}/v1/SystemEvents`;

const event: SystemEvent = {
    id: 'event-1',
    occurredAt: '2026-09-26T02:00:00Z',
    eventType: 'AnomalyDetected',
    description: 'Cadena de huellas rota en la factura INV-2026-09-000003.',
    triggeredBy: 'System'
};

describe('SystemEventService', () => {
    let service: SystemEventService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(SystemEventService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<SystemEvent> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            expect(req.request.params.has('EventType')).toBe(false);
            req.flush({ data: [event], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [event], totalCount: 1 });
        });

        it('sends EventType when provided', () => {
            service.list(1, 10, 'AnomalyDetected').subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('EventType')).toBe('AnomalyDetected');
            req.flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<SystemEvent> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('downloadReport()', () => {
        it('GETs Report with fromDate/toDate as query params, as a blob', () => {
            let result: OperationResult<Blob> | undefined;
            const pdfBlob = new Blob(['%PDF-fake'], { type: 'application/pdf' });

            service.downloadReport('2026-01-01', '2026-09-30').subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/Report`);
            expect(req.request.method).toBe('GET');
            expect(req.request.responseType).toBe('blob');
            expect(req.request.params.get('fromDate')).toBe('2026-01-01');
            expect(req.request.params.get('toDate')).toBe('2026-09-30');
            req.flush(pdfBlob);

            expect(result?.isSuccess).toBe(true);
            expect(result?.data).toBe(pdfBlob);
        });

        it('on a 400 with a real backend message (as a JSON blob), resolves with it instead of throwing', async () => {
            let result: OperationResult<Blob> | undefined;

            service.downloadReport('2026-01-01', '2026-09-30').subscribe((r) => (result = r));

            const errorBlob = new Blob([JSON.stringify({ isSuccess: false, message: 'No autorizado.' })], { type: 'application/json' });
            httpMock.expectOne((r) => r.url === `${BASE_URL}/Report`).flush(errorBlob, { status: 400, statusText: 'Bad Request' });

            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(result).toEqual({ isSuccess: false, message: 'No autorizado.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<Blob> | undefined;

            service.downloadReport('2026-01-01', '2026-09-30').subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/Report`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
