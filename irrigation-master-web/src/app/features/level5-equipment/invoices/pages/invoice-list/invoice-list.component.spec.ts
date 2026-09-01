import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { AssignedLicense } from '../../../../../shared/models/assigned-license.model';
import { Invoice, InvoiceStatus } from '../../../../../shared/models/invoice.model';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { Payment } from '../../../../../shared/models/payment.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { AssignedLicenseService } from '../../../../level2-structure/assigned-licenses/services/assigned-license.service';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { PaymentService } from '../../../payments/services/payment.service';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceListComponent } from './invoice-list.component';

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B123',
    address: { mainAddress: 'x', city: 'Sevilla', stateOrProvince: 'SE', postalCode: '41001', countryId: 'c1' },
    isActive: true,
    created: '2026-01-01',
    createdBy: 'system',
    invitationCode: 'ABC'
};

const licenceType: LicenceType = {
    id: 'licence-type-1',
    name: 'Plan Operativo Profesional',
    licenseCode: 'LIC-OP-004',
    description: 'x',
    durationInDays: 365,
    priceAmount: 149.99,
    priceCurrency: 'USD',
    isUsageBased: false,
    maxLevelAllowed: 'Operational',
    isDeleted: false,
    created: '2026-01-01'
};

const assignedLicense: AssignedLicense = {
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

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ricardo',
    lastName: 'Ruiz',
    email: 'ricardo@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: true,
    fullName: 'Ricardo Ruiz',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad de Regantes'
};

function invoice(overrides: Partial<Invoice> = {}): Invoice {
    return {
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
        assignedLicenseId: null,
        ...overrides
    };
}

function payment(overrides: Partial<Payment> = {}): Payment {
    return {
        id: 'payment-1',
        amountValue: 149.99,
        amountCurrency: 'EUR',
        paymentDate: '2026-01-05T00:00:00Z',
        method: 'Transfer',
        transactionId: 'TX-0001',
        invoiceId: 'invoice-1',
        status: 'Pending',
        ...overrides,
        organizationId: 'org-1'
    };
}

describe('InvoiceListComponent', () => {
    let component: InvoiceListComponent;
    let fixture: ComponentFixture<InvoiceListComponent>;
    let invoiceService: jasmine.SpyObj<InvoiceService>;
    let paymentService: jasmine.SpyObj<PaymentService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let userService: jasmine.SpyObj<UserService>;
    let assignedLicenseService: jasmine.SpyObj<AssignedLicenseService>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(role: string | null): void {
        invoiceService = jasmine.createSpyObj('InvoiceService', ['listMine', 'listAll', 'create', 'issue', 'cancel']);
        invoiceService.listMine.and.returnValue(of<ListResult<Invoice>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        invoiceService.listAll.and.returnValue(of<ListResult<Invoice>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        paymentService = jasmine.createSpyObj('PaymentService', ['listByInvoice', 'register', 'confirm']);
        paymentService.listByInvoice.and.returnValue(of<ListResult<Payment>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        userService = jasmine.createSpyObj('UserService', ['list']);
        userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [user], totalCount: 1 }));
        assignedLicenseService = jasmine.createSpyObj('AssignedLicenseService', ['list']);
        assignedLicenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [assignedLicense], totalCount: 1 }));
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [InvoiceListComponent],
            providers: [
                provideRouter([]),
                { provide: InvoiceService, useValue: invoiceService },
                { provide: PaymentService, useValue: paymentService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: UserService, useValue: userService },
                { provide: AssignedLicenseService, useValue: assignedLicenseService },
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(InvoiceListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    describe('gating por rol', () => {
        it('SUPERADMIN: puede ver, gestionar y registrar pagos', () => {
            setup('SUPERADMIN');
            expect(component.isSuperAdmin).toBe(true);
            expect(component.canViewInvoices).toBe(true);
            expect(component.canRegisterPayment).toBe(true);
            expect(component.canManage).toBe(true);
        });

        it('PRESIDENTE: puede ver y registrar pagos, no gestionar (crear/emitir/cancelar)', () => {
            setup('PRESIDENTE');
            expect(component.isSuperAdmin).toBe(false);
            expect(component.canViewInvoices).toBe(true);
            expect(component.canRegisterPayment).toBe(true);
            expect(component.canManage).toBe(false);
        });

        it('COORDINADOR_RIEGO: mismo acceso que PRESIDENTE', () => {
            setup('COORDINADOR_RIEGO');
            expect(component.canViewInvoices).toBe(true);
        });

        it('VICEPRESIDENTE: no tiene acceso (no está en el conjunto aprobado, a diferencia de otras pantallas)', () => {
            setup('VICEPRESIDENTE');
            expect(component.canViewInvoices).toBe(false);
            expect(component.canRegisterPayment).toBe(false);
        });

        it('VECINO (o cualquier otro rol): no puede ver ni registrar pagos', () => {
            setup('VECINO');
            expect(component.canViewInvoices).toBe(false);
            expect(component.canRegisterPayment).toBe(false);
        });
    });

    describe('ngOnInit()', () => {
        it('carga organización y usuarios para resolución, para cualquier rol', () => {
            setup('PRESIDENTE');

            component.ngOnInit();

            expect(component.organizationName('org-1')).toBe('Comunidad de Regantes');
            expect(component.scopeLabel(invoice({ userId: 'user-1' }))).toBe('Individual: Ricardo Ruiz');
        });

        it('SUPERADMIN: además resuelve la licencia de origen', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(assignedLicenseService.list).toHaveBeenCalled();
            expect(component.licenceOriginLabel(invoice({ assignedLicenseId: 'license-1' }))).toBe('Plan Operativo Profesional');
        });

        it('roles de organización: no intenta resolver la licencia de origen (endpoint exclusivo SUPERADMIN)', () => {
            setup('PRESIDENTE');

            component.ngOnInit();

            expect(assignedLicenseService.list).not.toHaveBeenCalled();
            expect(component.licenceOriginLabel(invoice({ assignedLicenseId: 'license-1' }))).toBe('Sí');
        });

        // Regresión: mismo bug que motivó VIEW_HYDRAULIC_SECTORS -- un permiso denegado en
        // cualquiera de estos catálogos se traducía en mostrar el ID crudo en vez del nombre, en
        // silencio.
        it('surfaces el mensaje de error cuando falla el catálogo de organizaciones', () => {
            setup('PRESIDENTE');
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: false, message: 'No tienes permiso para ver organizaciones.', items: [], totalCount: 0 }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No tienes permiso para ver organizaciones.');
        });

        it('surfaces el mensaje de error cuando falla el catálogo de usuarios', () => {
            setup('PRESIDENTE');
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: false, message: 'No tienes permiso para ver usuarios.', items: [], totalCount: 0 }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No tienes permiso para ver usuarios.');
        });

        it('SUPERADMIN: surfaces el mensaje de error cuando falla el catálogo de tipos de licencia', () => {
            setup('SUPERADMIN');
            licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: false, message: 'No tienes permiso para ver tipos de licencia.', items: [], totalCount: 0 }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No tienes permiso para ver tipos de licencia.');
        });

        it('SUPERADMIN: surfaces el mensaje de error cuando falla el catálogo de licencias asignadas', () => {
            setup('SUPERADMIN');
            assignedLicenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: false, message: 'No tienes permiso para ver licencias asignadas.', items: [], totalCount: 0 }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No tienes permiso para ver licencias asignadas.');
        });
    });

    describe('scopeLabel() / licenceOriginLabel()', () => {
        beforeEach(() => {
            setup('SUPERADMIN');
            component.ngOnInit();
        });

        it('scopeLabel(): "Organización" cuando userId es null', () => {
            expect(component.scopeLabel(invoice({ userId: null }))).toBe('Organización');
        });

        it('licenceOriginLabel(): "—" cuando no hay licencia de origen', () => {
            expect(component.licenceOriginLabel(invoice({ assignedLicenseId: null }))).toBe('—');
        });

        it('licenceOriginLabel(): cae al id crudo cuando no se puede resolver', () => {
            expect(component.licenceOriginLabel(invoice({ assignedLicenseId: 'missing-license' }))).toBe('missing-license');
        });
    });

    describe('statusLabel() / statusSeverity()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        const cases: { status: InvoiceStatus; label: string; severity: string }[] = [
            { status: 'Draft', label: 'Borrador', severity: 'secondary' },
            { status: 'Issued', label: 'Emitida', severity: 'info' },
            { status: 'Paid', label: 'Pagada', severity: 'success' },
            { status: 'Overdue', label: 'Vencida', severity: 'danger' },
            { status: 'Cancelled', label: 'Cancelada', severity: 'secondary' }
        ];

        for (const { status, label, severity } of cases) {
            it(`${status} -> "${label}" (${severity})`, () => {
                const i = invoice({ status });
                expect(component.statusLabel(i)).toBe(label);
                expect(component.statusSeverity(i)).toBe(severity);
            });
        }
    });

    describe('canIssue() / canCancel() / canRegister()', () => {
        it('SUPERADMIN: puede emitir solo en Draft, cancelar en Draft/Issued/Overdue, nunca en Paid/Cancelled', () => {
            setup('SUPERADMIN');

            expect(component.canIssue(invoice({ status: 'Draft' }))).toBe(true);
            expect(component.canIssue(invoice({ status: 'Issued' }))).toBe(false);

            expect(component.canCancel(invoice({ status: 'Draft' }))).toBe(true);
            expect(component.canCancel(invoice({ status: 'Issued' }))).toBe(true);
            expect(component.canCancel(invoice({ status: 'Overdue' }))).toBe(true);
            expect(component.canCancel(invoice({ status: 'Paid' }))).toBe(false);
            expect(component.canCancel(invoice({ status: 'Cancelled' }))).toBe(false);
        });

        it('PRESIDENTE: nunca puede emitir/cancelar (exclusivo SUPERADMIN)', () => {
            setup('PRESIDENTE');
            expect(component.canIssue(invoice({ status: 'Draft' }))).toBe(false);
            expect(component.canCancel(invoice({ status: 'Draft' }))).toBe(false);
        });

        it('canRegister(): solo en Issued/Overdue, para un rol con permiso', () => {
            setup('PRESIDENTE');
            expect(component.canRegister(invoice({ status: 'Draft' }))).toBe(false);
            expect(component.canRegister(invoice({ status: 'Issued' }))).toBe(true);
            expect(component.canRegister(invoice({ status: 'Overdue' }))).toBe(true);
            expect(component.canRegister(invoice({ status: 'Paid' }))).toBe(false);
        });

        it('canRegister(): siempre false para un rol sin permiso, aunque el estado sea válido', () => {
            setup('VECINO');
            expect(component.canRegister(invoice({ status: 'Issued' }))).toBe(false);
        });
    });

    describe('onLazyLoad()', () => {
        it('SUPERADMIN: usa listAll() (cross-tenant)', () => {
            setup('SUPERADMIN');
            invoiceService.listAll.and.returnValue(of<ListResult<Invoice>>({ isSuccess: true, message: 'ok', items: [invoice({})], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(invoiceService.listAll).toHaveBeenCalledWith(1, 10);
            expect(invoiceService.listMine).not.toHaveBeenCalled();
            expect(component.invoices().length).toBe(1);
            expect(component.totalRecords()).toBe(1);
        });

        it('PRESIDENTE: usa listMine() (acotado a su organización)', () => {
            setup('PRESIDENTE');
            invoiceService.listMine.and.returnValue(of<ListResult<Invoice>>({ isSuccess: true, message: 'ok', items: [invoice({})], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(invoiceService.listMine).toHaveBeenCalledWith(1, 10);
            expect(invoiceService.listAll).not.toHaveBeenCalled();
        });

        it('no hace nada si el rol no puede ver facturas', () => {
            setup('VECINO');

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(invoiceService.listMine).not.toHaveBeenCalled();
            expect(invoiceService.listAll).not.toHaveBeenCalled();
        });

        it('surfaces el mensaje de error real y vacía la tabla en fallo', () => {
            setup('SUPERADMIN');
            invoiceService.listAll.and.returnValue(of<ListResult<Invoice>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.invoices()).toEqual([]);
        });
    });

    it('issue()/cancel() no hacen nada cuando canManage es false', () => {
        setup('PRESIDENTE');

        component.issue(invoice({}));
        component.cancel(invoice({}));

        expect(invoiceService.issue).not.toHaveBeenCalled();
        expect(invoiceService.cancel).not.toHaveBeenCalled();
    });

    describe('issue() / cancel()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('issue(): llama al servicio, muestra un toast de éxito y recarga', () => {
            invoiceService.issue.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.issue(invoice({ id: 'invoice-9' }));

            expect(invoiceService.issue).toHaveBeenCalledWith('invoice-9');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(invoiceService.listAll).toHaveBeenCalled();
        });

        it('cancel(): llama al servicio, muestra un toast de éxito y recarga', () => {
            invoiceService.cancel.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.cancel(invoice({ id: 'invoice-9' }));

            expect(invoiceService.cancel).toHaveBeenCalledWith('invoice-9');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
        });

        it('en fallo, muestra un toast de error con el mensaje real y no recarga', () => {
            invoiceService.issue.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'La factura ya ha sido emitida.' }));
            invoiceService.listAll.calls.reset();

            component.issue(invoice({}));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'La factura ya ha sido emitida.' }));
            expect(invoiceService.listAll).not.toHaveBeenCalled();
        });
    });

    describe('openRegisterDialog() / confirmRegister()', () => {
        it('no abre el diálogo cuando canRegisterPayment es false', () => {
            setup('VECINO');

            component.openRegisterDialog(invoice({}));

            expect(component.registerDialogVisible()).toBe(false);
        });

        it('abre el diálogo precargado con el importe/moneda de la factura', () => {
            setup('PRESIDENTE');

            component.openRegisterDialog(invoice({ totalAmountValue: 200, totalAmountCurrency: 'USD' }));

            expect(component.registerDialogVisible()).toBe(true);
            expect(component.registerAmountValue()).toBe(200);
            expect(component.registerAmountCurrency()).toBe('USD');
        });

        it('confirmRegister(): no envía si el importe, la moneda o la referencia están vacíos', () => {
            setup('PRESIDENTE');
            component.openRegisterDialog(invoice({}));
            component.registerAmountValue.set(0);

            component.confirmRegister();

            expect(paymentService.register).not.toHaveBeenCalled();
            expect(component.registerTouched()).toBe(true);
        });

        it('confirmRegister(): en éxito, registra el pago, muestra un toast y cierra el diálogo', () => {
            setup('PRESIDENTE');
            paymentService.register.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'payment-9' }));
            component.openRegisterDialog(invoice({ id: 'invoice-9', totalAmountValue: 149.99, totalAmountCurrency: 'EUR' }));
            component.registerTransactionId.set('TX-0001');

            component.confirmRegister();

            expect(paymentService.register).toHaveBeenCalledWith({ invoiceId: 'invoice-9', amountValue: 149.99, amountCurrency: 'EUR', method: 'Transfer', transactionId: 'TX-0001' });
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(component.registerDialogVisible()).toBe(false);
        });

        it('confirmRegister(): en fallo, muestra un toast de error y mantiene el diálogo abierto', () => {
            setup('PRESIDENTE');
            paymentService.register.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La factura no admite el registro de un pago en su estado actual.' }));
            component.openRegisterDialog(invoice({}));
            component.registerTransactionId.set('TX-0001');

            component.confirmRegister();

            expect(component.registerDialogVisible()).toBe(true);
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'La factura no admite el registro de un pago en su estado actual.' }));
        });
    });

    it('confirmPayment(): no hace nada si no es SUPERADMIN', () => {
        setup('PRESIDENTE');

        component.confirmPayment(payment({}));

        expect(paymentService.confirm).not.toHaveBeenCalled();
    });

    describe('openPaymentsDialog() / confirmPayment()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('openPaymentsDialog(): abre el diálogo y carga los pagos de la factura', () => {
            paymentService.listByInvoice.and.returnValue(of<ListResult<Payment>>({ isSuccess: true, message: 'ok', items: [payment({})], totalCount: 1 }));

            component.openPaymentsDialog(invoice({ id: 'invoice-9' }));

            expect(paymentService.listByInvoice).toHaveBeenCalledWith('invoice-9', 1, 50);
            expect(component.paymentsDialogVisible()).toBe(true);
            expect(component.payments().length).toBe(1);
        });

        it('confirmPayment(): en éxito, confirma el pago, muestra un toast y recarga pagos + facturas', () => {
            paymentService.confirm.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.confirmPayment(payment({ id: 'payment-9', invoiceId: 'invoice-9' }));

            expect(paymentService.confirm).toHaveBeenCalledWith('payment-9');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(paymentService.listByInvoice).toHaveBeenCalledWith('invoice-9', 1, 50);
            expect(invoiceService.listAll).toHaveBeenCalled();
        });

        it('confirmPayment(): en fallo, muestra un toast de error', () => {
            paymentService.confirm.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'El pago ya fue confirmado.' }));

            component.confirmPayment(payment({}));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'El pago ya fue confirmado.' }));
        });
    });
});
