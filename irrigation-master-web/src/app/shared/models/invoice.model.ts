// Espejo de InvoiceResponseDto. UserId null = factura de organización completa; con valor =
// factura individual de ese usuario (mismo patrón que AssignedLicense.UserId). AssignedLicenseId
// referencia opcionalmente la AssignedLicense que motivó la factura.
export type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    totalAmountValue: number;
    totalAmountCurrency: string;
    status: InvoiceStatus;
    organizationId: string;
    orderId: string | null;
    paymentReference: string;
    userId: string | null;
    assignedLicenseId: string | null;
}

export interface CreateInvoiceRequest {
    organizationId: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    totalAmountValue: number;
    totalAmountCurrency: string;
    orderId?: string | null;
    userId?: string | null;
    assignedLicenseId?: string | null;
}
