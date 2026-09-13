import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { Invoice, InvoiceStatus } from '../../../../../shared/models/invoice.model';
import { InvoiceService } from '../../services/invoice.service';

// Mismo mapeo que invoice-list.component.ts -- se duplica deliberadamente aquí (pantalla de
// autoservicio, sin ningún gating de rol) en vez de compartirlo, para no acoplar esta pantalla al
// componente de back-office.
const STATUS_LABELS: Record<InvoiceStatus, string> = {
    Draft: 'Borrador',
    Issued: 'Emitida',
    Paid: 'Pagada',
    Overdue: 'Vencida',
    Cancelled: 'Cancelada'
};

const STATUS_SEVERITIES: Record<InvoiceStatus, 'success' | 'info' | 'danger' | 'secondary'> = {
    Draft: 'secondary',
    Issued: 'info',
    Paid: 'success',
    Overdue: 'danger',
    Cancelled: 'secondary'
};

@Component({
    selector: 'app-my-invoices',
    standalone: true,
    imports: [TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule, DatePipe, DecimalPipe],
    templateUrl: './my-invoices.component.html'
})
export class MyInvoicesComponent {
    private invoiceService = inject(InvoiceService);
    private messageService = inject(MessageService);

    readonly invoices = signal<Invoice[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly downloadingId = signal<string | null>(null);

    private lastFirst = 0;
    private lastRows = 10;

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    statusLabel(invoice: Invoice): string {
        return STATUS_LABELS[invoice.status];
    }

    statusSeverity(invoice: Invoice): 'success' | 'info' | 'danger' | 'secondary' {
        return STATUS_SEVERITIES[invoice.status];
    }

    canDownloadReceipt(invoice: Invoice): boolean {
        return invoice.status === 'Paid';
    }

    downloadReceipt(invoice: Invoice): void {
        if (!this.canDownloadReceipt(invoice) || this.downloadingId()) {
            return;
        }

        this.downloadingId.set(invoice.id);
        this.invoiceService.downloadReceipt(invoice.id).subscribe((result) => {
            this.downloadingId.set(null);

            if (!result.isSuccess || !result.data) {
                this.messageService.add({ severity: 'error', summary: 'No se pudo descargar el comprobante', detail: result.message });
                return;
            }

            const url = URL.createObjectURL(result.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `comprobante-${invoice.invoiceNumber}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.invoiceService.listMyIndividualInvoices(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.invoices.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
