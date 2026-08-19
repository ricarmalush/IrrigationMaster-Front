import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateHydraulicSectorRequest, HydraulicSector, UpdateHydraulicSectorRequest } from '../../../../shared/models/hydraulic-sector.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class HydraulicSectorService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/hydraulicsectors`;

    list(pageNumber = 1, pageSize = 10): Observable<ListResult<HydraulicSector>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<HydraulicSector>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<HydraulicSector>> {
        return toDetailResult(this.http.get<ApiResponse<HydraulicSector>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateHydraulicSectorRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateHydraulicSectorRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }
}
