import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { AssignedLicense, CreateAssignedLicenseRequest, RenewLicenseRequest } from '../../../../shared/models/assigned-license.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class AssignedLicenseService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/AssignedLicenses`;

    // Back-office SUPERADMIN puro: pagination usa ignoreQueryFilters en el backend, lista licencias
    // de TODAS las organizaciones, no solo la del que llama. Sin OrganizationId/nombres resueltos
    // -- se resuelven en cliente, igual que hicimos con sectores en Programs/Turnos.
    list(pageNumber = 1, pageSize = 10): Observable<ListResult<AssignedLicense>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<AssignedLicense>>(`${this.apiUrl}/pagination`, { params }));
    }

    create(request: CreateAssignedLicenseRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    // Renew ya no reactiva por si solo (fix reciente) -- Activate/Deactivate son las unicas formas
    // de tocar IsActive.
    activate(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Activate/${id}`, null));
    }

    deactivate(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Deactivate/${id}`, null));
    }

    renew(request: RenewLicenseRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/Renew`, request));
    }
}
