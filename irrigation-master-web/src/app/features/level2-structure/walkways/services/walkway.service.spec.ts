import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateWalkwayRequest, Walkway } from '../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { WalkwayService } from './walkway.service';

const BASE_URL = `${environment.apiUrl}/v1/walkways`;

const walkway: Walkway = { id: 'walkway-1', code: 'A-01', length: 120, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

describe('WalkwayService', () => {
    let service: WalkwayService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(WalkwayService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<Walkway> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [walkway], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [walkway], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<Walkway> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<Walkway> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });

        it('sends OrganizationId when provided', () => {
            service.list(1, 10, 'org-1').subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('OrganizationId')).toBe('org-1');
            req.flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });
        });

        it('omits OrganizationId from the query when not provided', () => {
            service.list().subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.has('OrganizationId')).toBe(false);
            req.flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });
        });
    });

    describe('getById()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<Walkway> | undefined;

            service.getById('walkway-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/walkway-1`).flush({ data: walkway, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: walkway });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: DetailResult<Walkway> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró la pasarela.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró la pasarela.' });
        });
    });

    describe('create()', () => {
        const request: CreateWalkwayRequest = { code: 'A-02', length: 80, hydraulicSectorId: 'sector-1' };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-walkway-id', isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 'new-walkway-id' });
        });

        it('on a 400 with backend validation errors, resolves with the real message', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'El sector hidráulico indicado no existe.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El sector hidráulico indicado no existe.' });
        });
    });

    describe('update()', () => {
        it('PUTs to Update/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('walkway-1', { code: 'A-01B', length: 100 }).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/walkway-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('walkway-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/walkway-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Delete/missing`).flush({ isSuccess: false, message: 'No se encontró la pasarela.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró la pasarela.' });
        });
    });
});
