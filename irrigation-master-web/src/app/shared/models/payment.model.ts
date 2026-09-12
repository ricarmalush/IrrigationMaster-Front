// Espejo de PaymentResponseDto. RegisterPayment deja el pago en Pending -- nunca lo completa; solo
// ConfirmPayment (SUPERADMIN) lo hace, y eso dispara PaymentCompletedEvent en el backend, que marca
// la factura como Paid automáticamente (no hay acción de Front que lo haga directamente).
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';
export type PaymentMethod = 'CreditCard' | 'Transfer' | 'Cash' | 'ExternalGateway';

export interface Payment {
    id: string;
    amountValue: number;
    amountCurrency: string;
    paymentDate: string;
    method: PaymentMethod;
    transactionId: string;
    invoiceId: string;
    status: PaymentStatus;
    organizationId: string;
}

export interface RegisterPaymentRequest {
    invoiceId: string;
    amountValue: number;
    amountCurrency: string;
    method: PaymentMethod;
    transactionId: string;
}

// Espejo de ConfirmAllPendingPaymentsResult. Un fallo individual (p. ej. un pago que ya no
// estaba Pending) nunca aborta el resto del lote -- se reporta en FailedPaymentIds.
export interface ConfirmAllPendingPaymentsResult {
    confirmedCount: number;
    failedCount: number;
    failedPaymentIds: string[];
}
