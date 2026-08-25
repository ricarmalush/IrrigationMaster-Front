import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateHydraulicSectorRequest, HydraulicSector } from '../../../../shared/models/hydraulic-sector.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { HydraulicSectorService } from './hydraulic-sector.service';

const BASE_URL = `${environment.apiUrl}/v1/hydraulicsectors`;

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5, organizationId: 'org-1', isDeleted: false };

describe('HydraulicSectorService', () => {
    let service: HydraulicSectorService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(HydraulicSectorService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<HydraulicSector> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [sector], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [sector], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<HydraulicSector> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<HydraulicSector> | undefined;

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
            let result: DetailResult<HydraulicSector> | undefined;

            service.getById('sector-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/sector-1`).flush({ data: sector, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: sector });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: DetailResult<HydraulicSector> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró el sector.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el sector.' });
        });
    });

    describe('create()', () => {
        const request: CreateHydraulicSectorRequest = { name: 'Sector Sur', areaSize: 8 };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-sector-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-sector-id' });
        });

        it('on a 400 with backend validation errors, resolves with the real message', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'El campo Name es obligatorio.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El campo Name es obligatorio.' });
        });
    });

    describe('update()', () => {
        it('PUTs to Update/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('sector-1', { id: 'sector-1', name: 'Editado', areaSize: 10 }).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/sector-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('sector-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/sector-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Delete/missing`).flush({ isSuccess: false, message: 'No se encontró el sector.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el sector.' });
        });
    });
});
