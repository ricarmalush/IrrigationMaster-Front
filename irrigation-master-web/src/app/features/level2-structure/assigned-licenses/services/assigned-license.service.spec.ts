import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AssignedLicense, CreateAssignedLicenseRequest, RenewLicenseRequest } from '../../../../shared/models/assigned-license.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { AssignedLicenseService } from './assigned-license.service';

const BASE_URL = `${environment.apiUrl}/v1/AssignedLicenses`;

const license: AssignedLicense = {
    id: 'license-1',
    organizationId: 'org-1',
    licenceTypeId: 'licence-type-1',
    userId: null,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T00:00:00Z',
    isActive: true,
    isExpired: false,
    created: '2026-01-01T00:00:00Z'
};

describe('AssignedLicenseService', () => {
    let service: AssignedLicenseService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(AssignedLicenseService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<AssignedLicense> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [license], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [license], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<AssignedLicense> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<AssignedLicense> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('create()', () => {
        const request: CreateAssignedLicenseRequest = { organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-license-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-license-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'La organización ya tiene una licencia activa.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La organización ya tiene una licencia activa.' });
        });

        it('POSTs with userId when creating an individual license', () => {
            let result: OperationResult<string> | undefined;
            const individualRequest: CreateAssignedLicenseRequest = { organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365, userId: 'user-1' };

            service.create(individualRequest).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.body).toEqual(individualRequest);
            req.flush({ data: 'new-license-id', isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 'new-license-id' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('activate()', () => {
        it('PUTs to Activate/{id} with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.activate('license-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Activate/license-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.activate('license-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Activate/license-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('deactivate()', () => {
        it('PUTs to Deactivate/{id} with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.deactivate('license-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Deactivate/license-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.deactivate('license-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Deactivate/license-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('renew()', () => {
        const request: RenewLicenseRequest = { id: 'license-1', extraDays: 30 };

        it('POSTs to Renew with the id and extraDays', () => {
            let result: OperationResult<boolean> | undefined;

            service.renew(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Renew`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.renew({ id: 'license-1', extraDays: 0 }).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Renew`).flush({ isSuccess: false, message: 'El valor de extraDays debe ser positivo.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El valor de extraDays debe ser positivo.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.renew(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Renew`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
