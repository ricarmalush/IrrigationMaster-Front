import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateWalkwayRequest, UpdateWalkwayRequest, Walkway } from '../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class WalkwayService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/walkways`;

    list(pageNumber = 1, pageSize = 10, organizationId?: string): Observable<ListResult<Walkway>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (organizationId) {
            params = params.set('OrganizationId', organizationId);
        }
        return toListResult(this.http.get<PagedApiResponse<Walkway>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<Walkway>> {
        return toDetailResult(this.http.get<ApiResponse<Walkway>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateWalkwayRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateWalkwayRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }
}
