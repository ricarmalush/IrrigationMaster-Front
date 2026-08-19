import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { AppUser, CreateUserRequest, UpdateUserRequest } from '../../../../shared/models/user.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Users`;

    list(pageNumber = 1, pageSize = 10, isActive?: boolean, organizationId?: string): Observable<ListResult<AppUser>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (isActive !== undefined) {
            params = params.set('IsActive', isActive);
        }
        if (organizationId) {
            params = params.set('OrganizationId', organizationId);
        }
        return toListResult(this.http.get<PagedApiResponse<AppUser>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<AppUser>> {
        return toDetailResult(this.http.get<ApiResponse<AppUser>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateUserRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateUserRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }

    activate(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Activate/${id}`, {}));
    }

    changeRole(id: string, roleId: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/ChangeRole/${id}`, { roleId }));
    }

    assignWalkway(id: string, walkwayId: string | null): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/AssignWalkway/${id}`, { walkwayId }));
    }

    resetPassword(id: string, newPassword: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/ResetPassword/${id}`, { newPassword }));
    }
}
