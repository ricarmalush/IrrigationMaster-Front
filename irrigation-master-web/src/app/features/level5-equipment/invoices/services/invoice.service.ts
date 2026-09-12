import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { extractErrorMessage, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
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

    // Autoservicio de licencia INDIVIDUAL del propio usuario -- distinto de listMine (organización
    // completa, exige VIEW_ORG_INVOICES). Sin permiso especial: el backend filtra por
    // Invoice.UserId == el propio caller.
    listMyIndividualInvoices(pageNumber = 1, pageSize = 10, status?: InvoiceStatus): Observable<ListResult<Invoice>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (status) {
            params = params.set('Status', status);
        }
        return toListResult(this.http.get<PagedApiResponse<Invoice>>(`${this.apiUrl}/MyInvoices`, { params }));
    }

    // El backend devuelve el PDF crudo (200) o un Response<bool> en JSON (400) -- pedimos blob
    // siempre y, si el status no es 2xx, releemos ese blob como texto para sacar el mensaje real
    // del backend en vez de mostrar un error genérico.
    downloadReceipt(invoiceId: string): Observable<OperationResult<Blob>> {
        return this.http.get(`${this.apiUrl}/${invoiceId}/receipt`, { observe: 'response', responseType: 'blob' }).pipe(
            map((response) => ({ isSuccess: true, message: '', data: response.body ?? undefined }) as OperationResult<Blob>),
            catchError((error: HttpErrorResponse) => {
                const errorBlob = error.error as Blob | undefined;
                if (!(errorBlob instanceof Blob)) {
                    return of<OperationResult<Blob>>({ isSuccess: false, message: extractErrorMessage(error) });
                }
                return from(errorBlob.text()).pipe(
                    switchMap((text) => {
                        try {
                            const parsed = JSON.parse(text) as ApiResponse<unknown>;
                            return of<OperationResult<Blob>>({ isSuccess: false, message: parsed.message });
                        } catch {
                            return of<OperationResult<Blob>>({ isSuccess: false, message: extractErrorMessage(error) });
                        }
                    })
                );
            })
        );
    }
}
