import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Organization, CreateOrganizationRequest } from '../../../../shared/models/organization.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { OrganizationService } from './organization.service';

const BASE_URL = `${environment.apiUrl}/v1/organizations`;

const address = {
    mainAddress: 'Calle Falsa 123',
    city: 'Springfield',
    stateOrProvince: 'SP',
    postalCode: '12345',
    countryId: 'country-1'
};

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B12345678',
    address,
    isActive: true,
    created: '2026-01-01T00:00:00Z',
    createdBy: 'system',
    invitationCode: 'ABC123'
};

describe('OrganizationService', () => {
    let service: OrganizationService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(OrganizationService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<Organization> | undefined;

            service.list(2, 20).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('2');
            expect(req.request.params.get('PageSize')).toBe('20');
            req.flush({ data: [organization], isSuccess: true, message: 'ok', pageNumber: 2, totalPages: 1, totalCount: 1, pageSize: 20 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<Organization> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<Organization> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
            expect(result?.items).toEqual([]);
        });
    });

    describe('getById()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<Organization> | undefined;

            service.getById('org-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/org-1`).flush({ data: organization, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: organization });
        });

        it('on a 404, resolves with the backend message instead of throwing', () => {
            let result: DetailResult<Organization> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró la organización.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró la organización.' });
        });
    });

    describe('create()', () => {
        const request: CreateOrganizationRequest = { name: 'Nueva', taxId: 'B999', address };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-org-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-org-id' });
        });

        it('on a 400 with backend validation errors, resolves with the real message', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock
                .expectOne(`${BASE_URL}/Create`)
                .flush({ isSuccess: false, message: 'El campo TaxId ya está registrado.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El campo TaxId ya está registrado.' });
        });
    });

    describe('update()', () => {
        it('PUTs to Update/{id}', () => {
            let result: OperationResult<boolean> | undefined;
            const request = { id: 'org-1', name: 'Editada', taxId: 'B12345678', address };

            service.update('org-1', request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/org-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400, resolves with the real backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('org-1', { id: 'org-1', name: '', taxId: 'B1', address }).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Update/org-1`).flush({ isSuccess: false, message: 'El campo Name es obligatorio.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El campo Name es obligatorio.' });
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('org-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/org-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Delete/missing`).flush({ isSuccess: false, message: 'No se encontró la organización.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró la organización.' });
        });
    });

    describe('restore()', () => {
        it('POSTs to Restore/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.restore('org-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Restore/org-1`);
            expect(req.request.method).toBe('POST');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });
});
