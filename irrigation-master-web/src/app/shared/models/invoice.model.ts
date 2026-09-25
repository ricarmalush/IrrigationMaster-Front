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
    // Desglose fiscal (Reglamento de Facturación español) e identidad del emisor congelada en la
    // factura -- opcionales porque el backend los añadió después de que existieran ya facturas y
    // mocks de test sin ellos; totalAmountValue/Currency siguen siendo el total real (Base + IVA).
    taxableBaseValue?: number;
    taxRate?: number;
    taxAmountValue?: number;
    issuerName?: string;
    issuerTaxId?: string;
    issuerAddress?: string;
}

// Espejo de InvoiceChainBreak/InvoiceChainVerificationResult (backend) -- resultado de
// POST /Invoices/VerifyChain (huella encadenada, RD 1007/2023).
export interface InvoiceChainBreak {
    invoiceNumber: string;
    reason: string;
}

export interface InvoiceChainVerificationResult {
    invoicesChecked: number;
    isIntact: boolean;
    breaks: InvoiceChainBreak[];
}

export interface CreateInvoiceRequest {
    organizationId: string;
    issueDate: string;
    dueDate: string;
    // Base imponible (sin IVA), no el total -- el backend calcula la cuota y el total a partir de
    // ella y de taxRate (o del tipo por defecto de la plataforma si se omite).
    taxableBaseValue: number;
    taxableBaseCurrency: string;
    taxRate?: number;
    orderId?: string | null;
    userId?: string | null;
    assignedLicenseId?: string | null;
}
