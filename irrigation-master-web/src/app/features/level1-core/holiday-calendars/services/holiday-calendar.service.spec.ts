import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateHolidayCalendarRequest, HolidayCalendar, UpdateHolidayCalendarRequest } from '../../../../shared/models/holiday-calendar.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { HolidayCalendarService } from './holiday-calendar.service';

const BASE_URL = `${environment.apiUrl}/v1/HolidayCalendars`;

const holiday: HolidayCalendar = {
    id: 'holiday-1',
    date: '2026-12-25T00:00:00',
    description: 'Navidad',
    isNationalHoliday: true,
    organizationId: 'org-1',
    created: '2026-01-01'
};

describe('HolidayCalendarService', () => {
    let service: HolidayCalendarService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(HolidayCalendarService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<HolidayCalendar> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [holiday], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [holiday], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<HolidayCalendar> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<HolidayCalendar> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('getById()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<HolidayCalendar> | undefined;

            service.getById('holiday-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/holiday-1`).flush({ data: holiday, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: holiday });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: DetailResult<HolidayCalendar> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró el festivo.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el festivo.' });
        });
    });

    describe('create()', () => {
        const request: CreateHolidayCalendarRequest = { date: '2026-12-25T00:00:00', description: 'Navidad', isNationalHoliday: true };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-holiday-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-holiday-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create({ ...request, description: '' }).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'La descripción es obligatoria.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La descripción es obligatoria.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('update()', () => {
        const request: UpdateHolidayCalendarRequest = { id: 'holiday-1', date: '2026-12-25T00:00:00', description: 'Navidad (editado)', isNationalHoliday: false };

        it('PUTs to Update/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('holiday-1', request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/holiday-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(request);
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('holiday-1', request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Update/holiday-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('holiday-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/holiday-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Delete/missing`).flush({ isSuccess: false, message: 'No se encontró el festivo.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el festivo.' });
        });
    });
});
