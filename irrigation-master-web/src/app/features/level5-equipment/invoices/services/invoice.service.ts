import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateInvoiceRequest, Invoice, InvoiceStatus } from '../../../../shared/models/invoice.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class InvoiceService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Invoices`;

    // Autoservicio de organización: acotado en el backend a la organización del usuario en sesión
    // (sin ignoreQueryFilters). Requiere SUPERADMIN o el permiso VIEW_ORG_INVOICES.
    listMine(pageNumber = 1, pageSize = 10, status?: InvoiceStatus): Observable<ListResult<Invoice>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (status) {
            params = params.set('Status', status);
        }
        return toListResult(this.http.get<PagedApiResponse<Invoice>>(`${this.apiUrl}/Mine`, { params }));
    }

    // Back-office cross-tenant: usa ignoreQueryFilters en el backend, exclusivo SUPERADMIN.
    listAll(pageNumber = 1, pageSize = 10, organizationId?: string, status?: InvoiceStatus): Observable<ListResult<Invoice>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (organizationId) {
            params = params.set('OrganizationId', organizationId);
        }
        if (status) {
            params = params.set('Status', status);
        }
        return toListResult(this.http.get<PagedApiResponse<Invoice>>(`${this.apiUrl}/pagination`, { params }));
    }

    create(request: CreateInvoiceRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    issue(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/issue`, null));
    }

    cancel(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/cancel`, null));
    }
}
