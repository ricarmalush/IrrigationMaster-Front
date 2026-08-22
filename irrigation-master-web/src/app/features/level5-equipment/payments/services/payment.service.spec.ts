import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { Payment, RegisterPaymentRequest } from '../../../../shared/models/payment.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { PaymentService } from './payment.service';

const BASE_URL = `${environment.apiUrl}/v1/Payments`;

const payment: Payment = {
    id: 'payment-1',
    amountValue: 149.99,
    amountCurrency: 'EUR',
    paymentDate: '2026-01-05T00:00:00Z',
    method: 'Transfer',
    transactionId: 'TX-0001',
    invoiceId: 'invoice-1',
    status: 'Pending',
    organizationId: 'org-1'
};

describe('PaymentService', () => {
    let service: PaymentService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(PaymentService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('listByInvoice()', () => {
        it('sends PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<Payment> | undefined;

            service.listByInvoice('invoice-1', 1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/byInvoice/invoice-1`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [payment], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [payment], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<Payment> | undefined;

            service.listByInvoice('invoice-1').subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/byInvoice/invoice-1`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<Payment> | undefined;

            service.listByInvoice('invoice-1').subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/byInvoice/invoice-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('register()', () => {
        const request: RegisterPaymentRequest = { invoiceId: 'invoice-1', amountValue: 149.99, amountCurrency: 'EUR', method: 'Transfer', transactionId: 'TX-0001' };

        it('POSTs to Register and resolves the new payment id on success', () => {
            let result: OperationResult<string> | undefined;

            service.register(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Register`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-payment-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-payment-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.register(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Register`).flush({ isSuccess: false, message: 'La factura no admite el registro de un pago en su estado actual.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La factura no admite el registro de un pago en su estado actual.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.register(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Register`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('confirm()', () => {
        it('PATCHes to {id}/confirm with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.confirm('payment-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/payment-1/confirm`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.confirm('payment-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/payment-1/confirm`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
