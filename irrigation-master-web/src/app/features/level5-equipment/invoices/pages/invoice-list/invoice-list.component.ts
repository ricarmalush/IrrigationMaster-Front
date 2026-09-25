import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
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

// Actualizado: seed.json ahora concede VIEW_ORG_INVOICES a PRESIDENTE y VICEPRESIDENTE (decisión
// vigente, sustituye a la anterior que incluía COORDINADOR_RIEGO en su lugar -- rol técnico de
// riego, sin atribuciones financieras, que nunca tuvo el permiso real en el backend). El backend
// sigue siendo la autoridad real vía permisos; este conjunto es el espejo en el Front.
const ORG_INVOICE_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'VICEPRESIDENTE'];

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
    imports: [RouterModule, FormsModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DialogModule, DatePickerModule, InputNumberModule, InputTextModule, SelectModule, DatePipe],
    templateUrl: './invoice-list.component.html',
    styleUrl: './invoice-list.component.scss'
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
    private confirmationService = inject(ConfirmationService);

    readonly paymentMethodOptions = PAYMENT_METHOD_OPTIONS;

    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';
    readonly canViewInvoices = ORG_INVOICE_ROLES.includes(this.currentSession.getRole() ?? '');
    // Exclusivo SUPERADMIN (decisión de negocio: el dinero de los pagos llega directamente a la
    // plataforma, nunca a Presidente/Vicepresidente) -- mismo criterio que Confirmar/Revertir/
    // Eliminar. REGISTER_PAYMENTS ya no se concede a esos roles en seed.json.
    readonly canRegisterPayment = this.isSuperAdmin;
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
    readonly downloadingReceiptId = signal<string | null>(null);

    readonly registerDialogVisible = signal(false);
    readonly registerAmountValue = signal(0);
    readonly registerAmountCurrency = signal('EUR');
    readonly registerMethod = signal<PaymentMethod>('Transfer');
    readonly registerTransactionId = signal('');
    readonly registerTouched = signal(false);
    readonly registering = signal(false);
    private registeringInvoiceId: string | null = null;
    // Total de la factura en el momento de abrir el diálogo -- referencia fija para detectar un
    // importe distinto al confirmar (ver confirmRegister()), independiente de lo que el usuario
    // termine tecleando en registerAmountValue.
    private registeringInvoiceTotal = 0;

    readonly paymentsDialogVisible = signal(false);
    readonly payments = signal<Payment[]>([]);
    readonly paymentsLoading = signal(false);
    readonly confirmingPaymentId = signal<string | null>(null);
    readonly revertingPaymentId = signal<string | null>(null);
    readonly deletingPaymentId = signal<string | null>(null);

    // "Marcar todos como pagados" opera sobre UNA organización a la vez -- esta pantalla, para
    // SUPERADMIN, lista facturas de TODAS las organizaciones a la vez, así que hace falta elegir
    // explícitamente sobre cuál organización aplicar el lote (no hay un filtro de organización
    // activo en la tabla hoy).
    readonly bulkOrganizationId = signal<string | null>(null);
    readonly bulkConfirming = signal(false);
    readonly sendingMonthlySummary = signal(false);
    readonly downloadingMonthlyReport = signal(false);

    // "Informe de auditoría de pagos" (SUPERADMIN): mismo bulkOrganizationId ya existente, con un
    // rango de fechas propio en un diálogo, ya que aquí sí hace falta cubrir varios meses de una
    // vez (a diferencia de "Enviar resumen mensual"/"Descargar informe del mes", siempre del mes
    // en curso).
    readonly auditReportDialogVisible = signal(false);
    readonly auditFromDate = signal<Date>(this.startOfCurrentMonth());
    readonly auditToDate = signal<Date>(new Date());
    readonly generatingAuditReport = signal(false);

    private lastFirst = 0;
    private lastRows = 10;

    ngOnInit(): void {
        // Las llamadas de aquí abajo alimentan mapas id->nombre para la tabla, no la lista de
        // facturas en sí -- antes, un permiso denegado en cualquiera de ellas se traducía en
        // mostrar el ID crudo en vez del nombre, en silencio (mismo bug que VIEW_HYDRAULIC_SECTORS).

        // OrganizationsController (listado paginado) es exclusivo SUPERADMIN -- Presidente/
        // Vicepresidente solo ven facturas de SU PROPIA organización (ya resuelta en el backend vía
        // currentUser.OrganizationId), así que ni necesitan este catálogo ni tienen permiso para
        // pedirlo: la llamada incondicional disparaba aquí "La acción sobre 'Organización' no está
        // permitida..." y dejaba la pantalla entera bloqueada para ellos.
        if (this.isSuperAdmin) {
            this.organizationService.list(1, 100).subscribe((result) => {
                this.organizationNames.set(Object.fromEntries(result.items.map((o) => [o.id, o.name])));
                if (!result.isSuccess) {
                    this.errorMessage.set(result.message);
                }
            });
        }
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

    // El backend (GenerateInvoiceReceiptQuery) solo genera comprobante de una factura ya Paid, y
    // autoriza tanto al propio titular como a SUPERADMIN/VIEW_ORG_INVOICES -- de ahí que este botón
    // de back-office, a diferencia de "Mis Facturas" (autoservicio), no necesite comprobar el
    // titular: canViewInvoices ya lo cubre para llegar hasta aquí.
    canDownloadReceipt(invoice: Invoice): boolean {
        return invoice.status === 'Paid';
    }

    downloadReceipt(invoice: Invoice): void {
        if (!this.canDownloadReceipt(invoice) || this.downloadingReceiptId()) {
            return;
        }

        this.downloadingReceiptId.set(invoice.id);
        this.invoiceService.downloadReceipt(invoice.id).subscribe((result) => {
            this.downloadingReceiptId.set(null);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo descargar el comprobante', detail: result.message });
                return;
            }

            this.triggerDownload(result.data, `comprobante-${invoice.invoiceNumber}.pdf`);
        });
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
        this.registeringInvoiceTotal = invoice.totalAmountValue;
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

        // No bloquea (deja la puerta abierta a pagos parciales legítimos) -- solo avisa antes de
        // guardar, para que un error de tecleo como registrar 5€ en una factura de 1€ no pase
        // desapercibido hasta después.
        if (this.registerAmountValue() !== this.registeringInvoiceTotal) {
            this.confirmationService.confirm({
                header: 'Importe distinto al de la factura',
                message: `El importe (${this.registerAmountValue().toFixed(2)} ${this.registerAmountCurrency()}) no coincide con el total de la factura (${this.registeringInvoiceTotal.toFixed(2)} ${this.registerAmountCurrency()}). ¿Continuar?`,
                icon: 'pi pi-exclamation-triangle',
                accept: () => this.doRegister()
            });
            return;
        }

        this.doRegister();
    }

    private doRegister(): void {
        if (!this.registeringInvoiceId) {
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

    // Deshace una confirmación por error (Completed -> Pending); la factura vuelve a Issued u
    // Overdue en el backend si sigue respaldada por este mismo pago.
    revertPayment(payment: Payment): void {
        if (!this.isSuperAdmin) {
            return;
        }

        this.revertingPaymentId.set(payment.id);
        this.paymentService.revert(payment.id).subscribe((result) => {
            this.revertingPaymentId.set(null);
            this.notify(result, 'Pago revertido', 'No se pudo revertir el pago');
            if (result.isSuccess) {
                this.loadPayments(payment.invoiceId);
                this.fetch();
            }
        });
    }

    // Elimina un pago Pending registrado por error -- nunca llegó a afectar la factura (sigue
    // Issued/Overdue), así que no hay nada que revertir, solo borrarlo (ver RevertPaymentCommand
    // para un pago ya Completed).
    confirmDeletePending(payment: Payment): void {
        if (!this.isSuperAdmin) {
            return;
        }

        this.confirmationService.confirm({
            header: 'Eliminar pago pendiente',
            message: `¿Eliminar el pago de ${payment.amountValue.toFixed(2)} ${payment.amountCurrency} (ref. ${payment.transactionId})? Esta acción no se puede deshacer.`,
            icon: 'pi pi-exclamation-triangle',
            accept: () => this.deletePending(payment)
        });
    }

    private deletePending(payment: Payment): void {
        this.deletingPaymentId.set(payment.id);
        this.paymentService.deletePending(payment.id).subscribe((result) => {
            this.deletingPaymentId.set(null);
            this.notify(result, 'Pago eliminado', 'No se pudo eliminar el pago');
            if (result.isSuccess) {
                this.loadPayments(payment.invoiceId);
            }
        });
    }

    // Opciones del selector de organización para el lote -- reutiliza el mismo mapa id->nombre ya
    // cargado en ngOnInit para la columna "Organización" de la tabla.
    organizationOptions(): { label: string; value: string }[] {
        return Object.entries(this.organizationNames()).map(([id, name]) => ({ label: name, value: id }));
    }

    confirmAllPendingForCurrentMonth(): void {
        const organizationId = this.bulkOrganizationId();
        if (!this.isSuperAdmin || !organizationId) {
            return;
        }

        this.bulkConfirming.set(true);
        this.paymentService.confirmAllPendingForCurrentMonth(organizationId).subscribe((result) => {
            this.bulkConfirming.set(false);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo completar el confirmado masivo', detail: result.message });
                return;
            }

            const { confirmedCount, failedCount } = result.data;
            this.messageService.add({
                severity: failedCount === 0 ? 'success' : 'warn',
                summary: 'Confirmado masivo completado',
                detail: failedCount === 0
                    ? `${confirmedCount} pago(s) confirmado(s).`
                    : `${confirmedCount} confirmado(s), ${failedCount} no se pudieron confirmar.`
            });
            this.fetch();
        });
    }

    // Organización objetivo del resumen mensual: para SUPERADMIN, la elegida en el selector del
    // lote (esta pantalla lista TODAS las organizaciones a la vez); para Presidente/
    // Vicepresidente, siempre la propia (ellos solo ven su propia organización de todos modos).
    private summaryTargetOrganizationId(): string | null {
        return this.isSuperAdmin ? this.bulkOrganizationId() : this.currentSession.getOrganizationId();
    }

    sendMonthlySummary(): void {
        const organizationId = this.summaryTargetOrganizationId();
        if (!this.canViewInvoices || !organizationId) {
            return;
        }

        this.sendingMonthlySummary.set(true);
        this.invoiceService.sendMonthlySummary(organizationId).subscribe((result) => {
            this.sendingMonthlySummary.set(false);
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Resumen mensual enviado' : 'No se pudo enviar el resumen mensual',
                detail: result.isSuccess ? `Enviado a ${result.data} destinatario(s).` : result.message
            });
        });
    }

    // Mismo alcance (organización + mes en curso) que sendMonthlySummary(), pero como PDF
    // descargable en vez de email.
    downloadMonthlyReport(): void {
        const organizationId = this.summaryTargetOrganizationId();
        if (!this.canViewInvoices || !organizationId) {
            return;
        }

        const now = new Date();
        this.downloadingMonthlyReport.set(true);
        this.invoiceService.downloadMonthlyReport(organizationId, now.getFullYear(), now.getMonth() + 1).subscribe((result) => {
            this.downloadingMonthlyReport.set(false);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo descargar el informe', detail: result.message });
                return;
            }

            this.triggerDownload(result.data, `informe-mensual-${organizationId}-${now.getFullYear()}-${now.getMonth() + 1}.pdf`);
        });
    }

    // Abre el diálogo del informe de auditoría -- requiere organización elegida en el selector del
    // lote (mismo bulkOrganizationId que "Marcar todos como pagados").
    openAuditReportDialog(): void {
        if (!this.isSuperAdmin || !this.bulkOrganizationId()) {
            return;
        }

        this.auditFromDate.set(this.startOfCurrentMonth());
        this.auditToDate.set(new Date());
        this.auditReportDialogVisible.set(true);
    }

    confirmAuditReport(): void {
        const organizationId = this.bulkOrganizationId();
        if (!this.isSuperAdmin || !organizationId) {
            return;
        }

        const fromDate = this.auditFromDate();
        const toDate = this.auditToDate();

        this.generatingAuditReport.set(true);
        this.invoiceService.downloadAuditReport(organizationId, this.toDateOnlyString(fromDate), this.toDateOnlyString(toDate)).subscribe((result) => {
            this.generatingAuditReport.set(false);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo generar el informe de auditoría', detail: result.message });
                return;
            }

            this.triggerDownload(result.data, `auditoria-pagos-${organizationId}-${this.toDateOnlyString(fromDate)}-${this.toDateOnlyString(toDate)}.pdf`);
            this.auditReportDialogVisible.set(false);
        });
    }

    private triggerDownload(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
    }

    private startOfCurrentMonth(): Date {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    private toDateOnlyString(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
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
