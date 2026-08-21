import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { PagedApiResponse, ApiResponse } from '../../../../shared/models/api-response.model';
import { CreateOrganizationRequest, Organization, UpdateOrganizationRequest } from '../../../../shared/models/organization.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class OrganizationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/organizations`;

    list(pageNumber = 1, pageSize = 10): Observable<ListResult<Organization>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<Organization>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<Organization>> {
        return toDetailResult(this.http.get<ApiResponse<Organization>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateOrganizationRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateOrganizationRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }

    restore(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/Restore/${id}`, {}));
    }

    // Autogenera un código nuevo (customCode null) -- RegenerateInvitationCodeCommand exige el
    // permiso MANAGE_ORGANIZATION_CODE o SUPERADMIN, y solo alcanza la propia organización.
    regenerateInvitationCode(organizationId: string, customCode?: string): Observable<OperationResult<string>> {
        return toOperationResult(this.http.put<ApiResponse<string>>(`${this.apiUrl}/RegenerateInvitationCode/${organizationId}`, { organizationId, customCode: customCode ?? null }));
    }
}
