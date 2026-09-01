import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { AssignedLicenseService } from '../../../../level2-structure/assigned-licenses/services/assigned-license.service';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { Invoice, InvoiceStatus } from '../../../../../shared/models/invoice.model';
import { Payment, PaymentMethod, PaymentStatus } from '../../../../../shared/models/payment.model';
import { PaymentService } from '../../../payments/services/payment.service';
import { InvoiceService } from '../../services/invoice.service';

// Confirmado con el usuario: por defecto, en los datos semilla del backend, ningún rol de
// organización tiene asignados VIEW_ORG_INVOICES ni REGISTER_PAYMENTS -- este es el conjunto
// aprobado para el gating del Front (PRESIDENTE y COORDINADOR_RIEGO, sin VicePresidente), el
// backend sigue siendo la autoridad real vía permisos.
const ORG_INVOICE_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'COORDINADOR_RIEGO'];

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
    Draft: 'Borrador',
    Issued: 'Emitida',
    Paid: 'Pagada',
    Overdue: 'Vencida',
    Cancelled: 'Cancelada'
};

const INVOICE_STATUS_SEVERITIES: Record<InvoiceStatus, 'success' | 'info' | 'danger' | 'secondary'> = {
    Draft: 'secondary',
    Issued: 'info',
    Paid: 'success',
    Overdue: 'danger',
    Cancelled: 'secondary'
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
    Pending: 'Pendiente',
    Completed: 'Completado',
    Failed: 'Fallido',
    Refunded: 'Reembolsado'
};

const PAYMENT_STATUS_SEVERITIES: Record<PaymentStatus, 'success' | 'warn' | 'danger' | 'secondary'> = {
    Pending: 'warn',
    Completed: 'success',
    Failed: 'danger',
    Refunded: 'secondary'
};

const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethod }[] = [
    { label: 'Transferencia', value: 'Transfer' },
    { label: 'Tarjeta', value: 'CreditCard' },
    { label: 'Efectivo', value: 'Cash' },
    { label: 'Pasarela externa', value: 'ExternalGateway' }
];

@Component({
    selector: 'app-invoice-list',
    standalone: true,
    imports: [RouterModule, FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DialogModule, InputNumberModule, InputTextModule, SelectModule, DatePipe],
    templateUrl: './invoice-list.component.html'
})
export class InvoiceListComponent implements OnInit {
    private invoiceService = inject(InvoiceService);
    private paymentService = inject(PaymentService);
    private organizationService = inject(OrganizationService);
    private userService = inject(UserService);
    private assignedLicenseService = inject(AssignedLicenseService);
    private licenceTypeService = inject(LicenceTypeService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';
    readonly canViewInvoices = ORG_INVOICE_ROLES.includes(this.currentSession.getRole() ?? '');
    // Registrar pago comparte el mismo conjunto de roles que ver el listado (confirmado con el
    // usuario): quien puede ver sus facturas también puede aportar la referencia de un pago.
    readonly canRegisterPayment = this.canViewInvoices;
    // Crear/Emitir/Cancelar factura y Confirmar pago son exclusivos de SUPERADMIN en el backend.
    readonly canManage = this.isSuperAdmin;

    readonly invoices = signal<Invoice[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly organizationNames = signal<Record<string, string>>({});
    readonly userNames = signal<Record<string, string>>({});
    readonly licenceOriginNames = signal<Record<string, string>>({});
    readonly actingId = signal<string | null>(null);

    readonly registerDialogVisible = signal(false);
    readonly registerAmountValue = signal(0);
    readonly registerAmountCurrency = signal('EUR');
    readonly registerMethod = signal<PaymentMethod>('Transfer');
    readonly registerTransactionId = signal('');
    readonly registerTouched = signal(false);
    readonly registering = signal(false);
    private registeringInvoiceId: string | null = null;

    readonly paymentsDialogVisible = signal(false);
    readonly payments = signal<Payment[]>([]);
    readonly paymentsLoading = signal(false);
    readonly confirmingPaymentId = signal<string | null>(null);

    private lastFirst = 0;
    private lastRows = 10;

    ngOnInit(): void {
        // Las cuatro llamadas de aquí abajo alimentan mapas id->nombre para la tabla, no la lista
        // de facturas en sí -- antes, un permiso denegado en cualquiera de ellas se traducía en
        // mostrar el ID crudo en vez del nombre, en silencio (mismo bug que VIEW_HYDRAULIC_SECTORS).
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationNames.set(Object.fromEntries(result.items.map((o) => [o.id, o.name])));
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
        // Sin OrganizationId: para SUPERADMIN devuelve usuarios de todas las organizaciones, igual
        // que en license-list (las facturas individuales pueden ser de cualquier organización).
        this.userService.list(1, 100).subscribe((result) => {
            this.userNames.set(Object.fromEntries(result.items.map((u) => [u.id, u.fullName])));
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });

        // AssignedLicensesController es exclusivo SUPERADMIN -- solo intentamos resolver el nombre
        // de la licencia de origen cuando tenemos acceso real a ese catálogo.
        if (this.isSuperAdmin) {
            this.licenceTypeService.list(1, 100).subscribe((typeResult) => {
                if (!typeResult.isSuccess) {
                    this.errorMessage.set(typeResult.message);
                }
                const typeNames = Object.fromEntries(typeResult.items.map((t) => [t.id, t.name]));
                this.assignedLicenseService.list(1, 100).subscribe((licenseResult) => {
                    this.licenceOriginNames.set(Object.fromEntries(licenseResult.items.map((l) => [l.id, typeNames[l.licenceTypeId] ?? l.licenceTypeId])));
                    if (!licenseResult.isSuccess) {
                        this.errorMessage.set(licenseResult.message);
                    }
                });
            });
        }
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    organizationName(organizationId: string): string {
        return this.organizationNames()[organizationId] ?? organizationId;
    }

    // Ámbito de la factura: de organización (UserId null) o individual, acotada a un único usuario
    // dentro de esa organización -- mismo criterio que AssignedLicense.
    scopeLabel(invoice: Invoice): string {
        if (!invoice.userId) {
            return 'Organización';
        }
        return `Individual: ${this.userNames()[invoice.userId] ?? invoice.userId}`;
    }

    // "—" si no viene de ninguna licencia; para quien no tiene acceso al catálogo de licencias
    // (roles de organización) solo confirmamos que existe el vínculo, sin inventar un nombre.
    licenceOriginLabel(invoice: Invoice): string {
        if (!invoice.assignedLicenseId) {
            return '—';
        }
        if (!this.isSuperAdmin) {
            return 'Sí';
        }
        return this.licenceOriginNames()[invoice.assignedLicenseId] ?? invoice.assignedLicenseId;
    }

    statusLabel(invoice: Invoice): string {
        return INVOICE_STATUS_LABELS[invoice.status];
    }

    statusSeverity(invoice: Invoice): 'success' | 'info' | 'danger' | 'secondary' {
        return INVOICE_STATUS_SEVERITIES[invoice.status];
    }

    paymentStatusLabel(payment: Payment): string {
        return PAYMENT_STATUS_LABELS[payment.status];
    }

    paymentStatusSeverity(payment: Payment): 'success' | 'warn' | 'danger' | 'secondary' {
        return PAYMENT_STATUS_SEVERITIES[payment.status];
    }

    canIssue(invoice: Invoice): boolean {
        return this.canManage && invoice.status === 'Draft';
    }

    canCancel(invoice: Invoice): boolean {
        return this.canManage && (invoice.status === 'Draft' || invoice.status === 'Issued' || invoice.status === 'Overdue');
    }

    canRegister(invoice: Invoice): boolean {
        return this.canRegisterPayment && (invoice.status === 'Issued' || invoice.status === 'Overdue');
    }

    issue(invoice: Invoice): void {
        if (!this.canManage) {
            return;
        }

        this.actingId.set(invoice.id);
        this.invoiceService.issue(invoice.id).subscribe((result) => {
            this.actingId.set(null);
            this.notify(result, 'Factura emitida', 'No se pudo emitir la factura');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    cancel(invoice: Invoice): void {
        if (!this.canManage) {
            return;
        }

        this.actingId.set(invoice.id);
        this.invoiceService.cancel(invoice.id).subscribe((result) => {
            this.actingId.set(null);
            this.notify(result, 'Factura cancelada', 'No se pudo cancelar la factura');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    openRegisterDialog(invoice: Invoice): void {
        if (!this.canRegisterPayment) {
            return;
        }

        this.registeringInvoiceId = invoice.id;
        this.registerAmountValue.set(invoice.totalAmountValue);
        this.registerAmountCurrency.set(invoice.totalAmountCurrency);
        this.registerMethod.set('Transfer');
        this.registerTransactionId.set('');
        this.registerTouched.set(false);
        this.registerDialogVisible.set(true);
    }

    confirmRegister(): void {
        if (!this.registeringInvoiceId) {
            return;
        }

        this.registerTouched.set(true);
        if (this.registerAmountValue() <= 0 || !this.registerAmountCurrency().trim() || !this.registerTransactionId().trim()) {
            return;
        }

        this.registering.set(true);
        this.paymentService
            .register({
                invoiceId: this.registeringInvoiceId,
                amountValue: this.registerAmountValue(),
                amountCurrency: this.registerAmountCurrency(),
                method: this.registerMethod(),
                transactionId: this.registerTransactionId()
            })
            .subscribe((result) => {
                this.registering.set(false);
                this.notify(result, 'Pago registrado', 'No se pudo registrar el pago');
                if (result.isSuccess) {
                    this.registerDialogVisible.set(false);
                }
            });
    }

    openPaymentsDialog(invoice: Invoice): void {
        this.paymentsDialogVisible.set(true);
        this.loadPayments(invoice.id);
    }

    confirmPayment(payment: Payment): void {
        if (!this.isSuperAdmin) {
            return;
        }

        this.confirmingPaymentId.set(payment.id);
        this.paymentService.confirm(payment.id).subscribe((result) => {
            this.confirmingPaymentId.set(null);
            this.notify(result, 'Pago confirmado', 'No se pudo confirmar el pago');
            if (result.isSuccess) {
                this.loadPayments(payment.invoiceId);
                this.fetch();
            }
        });
    }

    private loadPayments(invoiceId: string): void {
        this.paymentsLoading.set(true);
        this.paymentService.listByInvoice(invoiceId, 1, 50).subscribe((result) => {
            this.paymentsLoading.set(false);
            this.payments.set(result.items);
        });
    }

    private notify(result: { isSuccess: boolean; message: string }, successSummary: string, failureSummary: string): void {
        this.messageService.add({
            severity: result.isSuccess ? 'success' : 'error',
            summary: result.isSuccess ? successSummary : failureSummary,
            detail: result.message
        });
    }

    private fetch(): void {
        if (!this.canViewInvoices) {
            return;
        }

        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        const source = this.isSuperAdmin ? this.invoiceService.listAll(pageNumber, this.lastRows) : this.invoiceService.listMine(pageNumber, this.lastRows);
        source.subscribe((result) => {
            this.loading.set(false);
            this.invoices.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
