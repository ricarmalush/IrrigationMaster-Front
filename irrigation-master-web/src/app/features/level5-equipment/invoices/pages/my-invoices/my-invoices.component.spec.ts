import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { Invoice } from '../../../../../shared/models/invoice.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { InvoiceService } from '../../services/invoice.service';
import { MyInvoicesComponent } from './my-invoices.component';

const paidInvoice: Invoice = {
    id: 'invoice-1',
    invoiceNumber: 'INV-001',
    issueDate: '2026-08-01T00:00:00Z',
    dueDate: '2026-08-15T00:00:00Z',
    totalAmountValue: 19.9,
    totalAmountCurrency: 'EUR',
    status: 'Paid',
    organizationId: 'org-1',
    orderId: null,
    paymentReference: 'payment-1',
    userId: 'user-1',
    assignedLicenseId: null
};

const issuedInvoice: Invoice = { ...paidInvoice, id: 'invoice-2', invoiceNumber: 'INV-002', status: 'Issued', paymentReference: '' };

describe('MyInvoicesComponent', () => {
    let component: MyInvoicesComponent;
    let fixture: ComponentFixture<MyInvoicesComponent>;
    let invoiceService: jasmine.SpyObj<InvoiceService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(): void {
        invoiceService = jasmine.createSpyObj('InvoiceService', ['listMyIndividualInvoices', 'downloadReceipt']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [MyInvoicesComponent],
            providers: [
                { provide: InvoiceService, useValue: invoiceService },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(MyInvoicesComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup();
        expect(component).toBeTruthy();
    });

    describe('canDownloadReceipt()', () => {
        beforeEach(() => setup());

        it('is true only for Paid invoices', () => {
            expect(component.canDownloadReceipt(paidInvoice)).toBe(true);
            expect(component.canDownloadReceipt(issuedInvoice)).toBe(false);
        });
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup());

        it('loads a page and exposes the items/total on success', () => {
            invoiceService.listMyIndividualInvoices.and.returnValue(of<ListResult<Invoice>>({ isSuccess: true, message: 'ok', items: [paidInvoice, issuedInvoice], totalCount: 2 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(invoiceService.listMyIndividualInvoices).toHaveBeenCalledWith(1, 10);
            expect(component.invoices()).toEqual([paidInvoice, issuedInvoice]);
            expect(component.totalRecords()).toBe(2);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message on failure', () => {
            invoiceService.listMyIndividualInvoices.and.returnValue(of<ListResult<Invoice>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    describe('downloadReceipt()', () => {
        beforeEach(() => setup());

        it('does nothing for a non-Paid invoice', () => {
            component.downloadReceipt(issuedInvoice);

            expect(invoiceService.downloadReceipt).not.toHaveBeenCalled();
        });

        it('on success, calls the service and clears the downloading flag', () => {
            const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
            invoiceService.downloadReceipt.and.returnValue(of<OperationResult<Blob>>({ isSuccess: true, message: '', data: blob }));
            spyOn(URL, 'createObjectURL').and.returnValue('blob:fake-url');
            spyOn(URL, 'revokeObjectURL');

            component.downloadReceipt(paidInvoice);

            expect(invoiceService.downloadReceipt).toHaveBeenCalledWith('invoice-1');
            expect(component.downloadingId()).toBeNull();
            expect(messageService.add).not.toHaveBeenCalled();
        });

        it('on failure, shows an error toast instead of downloading', () => {
            invoiceService.downloadReceipt.and.returnValue(of<OperationResult<Blob>>({ isSuccess: false, message: 'No se pudo generar el comprobante.' }));

            component.downloadReceipt(paidInvoice);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo generar el comprobante.' }));
        });
    });
});
