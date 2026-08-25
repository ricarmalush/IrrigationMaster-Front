import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateLicenceTypeRequest, LicenceType, UpdateLicenceTypeRequest } from '../../../../shared/models/licence-type.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { LicenceTypeService } from './licence-type.service';

const BASE_URL = `${environment.apiUrl}/v1/LicenceTypeCatalogue`;

const licenceType: LicenceType = {
    id: 'licence-type-1',
    name: 'Plan Operativo Profesional',
    licenseCode: 'LIC-OP-004',
    description: 'Plan estandar',
    durationInDays: 365,
    priceAmount: 149.99,
    priceCurrency: 'USD',
    isUsageBased: false,
    maxLevelAllowed: 'Operational',
    isDeleted: false,
    created: '2026-01-01'
};

describe('LicenceTypeService', () => {
    let service: LicenceTypeService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(LicenceTypeService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<LicenceType> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [licenceType], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<LicenceType> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<LicenceType> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('getById()', () => {
        it('GETs Get/{id} and resolves the licence type on success', () => {
            let result: DetailResult<LicenceType> | undefined;

            service.getById('licence-type-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Get/licence-type-1`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: licenceType, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: licenceType });
        });

        it('on a 404, resolves with isSuccess:false instead of throwing', () => {
            let result: DetailResult<LicenceType> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se ha encontrado el registro solicitado.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se ha encontrado el registro solicitado.' });
        });
    });

    describe('create()', () => {
        const request: CreateLicenceTypeRequest = {
            name: 'Plan Operativo Profesional',
            licenseCode: 'LIC-OP-004',
            description: 'Plan estandar',
            durationInDays: 365,
            priceAmount: 149.99,
            priceCurrency: 'USD',
            isUsageBased: false,
            maxLevelAllowed: 'Operational'
        };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-licence-type-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-licence-type-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'El código de licencia ya existe.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El código de licencia ya existe.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('update()', () => {
        const request: UpdateLicenceTypeRequest = {
            id: 'licence-type-1',
            name: 'Plan Operativo Profesional',
            licenseCode: 'LIC-OP-004',
            description: 'Plan estandar',
            durationInDays: 365,
            priceAmount: 149.99,
            priceCurrency: 'USD',
            isUsageBased: false,
            maxLevelAllowed: 'Operational'
        };

        it('PUTs to Update/{id} and resolves success', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('licence-type-1', request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/licence-type-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(request);
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('licence-type-1', request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Update/licence-type-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id} and resolves success', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('licence-type-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/licence-type-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('licence-type-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Delete/licence-type-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
