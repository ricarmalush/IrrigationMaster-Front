import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateInvoiceRequest, Invoice } from '../../../../shared/models/invoice.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { InvoiceService } from './invoice.service';

const BASE_URL = `${environment.apiUrl}/v1/Invoices`;

const invoice: Invoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-0001',
    issueDate: '2026-01-01T00:00:00Z',
    dueDate: '2026-01-31T00:00:00Z',
    totalAmountValue: 149.99,
    totalAmountCurrency: 'EUR',
    status: 'Draft',
    organizationId: 'org-1',
    orderId: null,
    paymentReference: '',
    userId: null,
    assignedLicenseId: null
};

describe('InvoiceService', () => {
    let service: InvoiceService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(InvoiceService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('listMine()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<Invoice> | undefined;

            service.listMine(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            expect(req.request.params.has('Status')).toBe(false);
            req.flush({ data: [invoice], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [invoice], totalCount: 1 });
        });

        it('sends Status when provided', () => {
            service.listMine(1, 10, 'Issued').subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`);
            expect(req.request.params.get('Status')).toBe('Issued');
            req.flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<Invoice> | undefined;

            service.listMine().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/Mine`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('listAll()', () => {
        it('sends PageNumber/PageSize/OrganizationId/Status and maps a successful page', () => {
            let result: ListResult<Invoice> | undefined;

            service.listAll(1, 10, 'org-1', 'Paid').subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('OrganizationId')).toBe('org-1');
            expect(req.request.params.get('Status')).toBe('Paid');
            req.flush({ data: [invoice], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [invoice], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<Invoice> | undefined;

            service.listAll().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<Invoice> | undefined;

            service.listAll().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('create()', () => {
        const request: CreateInvoiceRequest = {
            organizationId: 'org-1',
            invoiceNumber: 'INV-0001',
            issueDate: '2026-01-01T00:00:00',
            dueDate: '2026-01-31T00:00:00',
            totalAmountValue: 149.99,
            totalAmountCurrency: 'EUR'
        };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-invoice-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-invoice-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'La organización ya tiene una factura en borrador.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La organización ya tiene una factura en borrador.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('issue()', () => {
        it('PATCHes to {id}/issue with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.issue('invoice-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/invoice-1/issue`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.issue('invoice-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/invoice-1/issue`).flush({ isSuccess: false, message: 'La factura ya ha sido emitida.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La factura ya ha sido emitida.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.issue('invoice-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/invoice-1/issue`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('cancel()', () => {
        it('PATCHes to {id}/cancel with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.cancel('invoice-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/invoice-1/cancel`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.cancel('invoice-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/invoice-1/cancel`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
