import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { Payment, RegisterPaymentRequest } from '../../../../shared/models/payment.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class PaymentService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Payments`;

    // Requiere SUPERADMIN o el permiso VIEW_ORG_INVOICES sobre la organización de la factura.
    listByInvoice(invoiceId: string, pageNumber = 1, pageSize = 10): Observable<ListResult<Payment>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<Payment>>(`${this.apiUrl}/byInvoice/${invoiceId}`, { params }));
    }

    // Deja el pago en Pending -- nunca completa la factura por sí solo (ver ConfirmPayment). Solo
    // sobre facturas de la propia organización del que llama.
    register(request: RegisterPaymentRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Register`, request));
    }

    // Exclusivo SUPERADMIN: completa el pago y dispara el registro automático de la factura como
    // pagada en el backend.
    confirm(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/confirm`, null));
    }
}
