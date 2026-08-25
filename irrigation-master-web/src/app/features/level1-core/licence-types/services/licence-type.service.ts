import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateLicenceTypeRequest, LicenceType, UpdateLicenceTypeRequest } from '../../../../shared/models/licence-type.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class LicenceTypeService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/LicenceTypeCatalogue`;

    // Catalogo global, de lectura abierta a cualquier autenticado -- lo usamos tanto para
    // resolver nombres en Licencias/Facturación como para alimentar esta pantalla de gestión.
    list(pageNumber = 1, pageSize = 10): Observable<ListResult<LicenceType>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<LicenceType>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<LicenceType>> {
        return toDetailResult(this.http.get<ApiResponse<LicenceType>>(`${this.apiUrl}/Get/${id}`));
    }

    // Create/Update/Delete son exclusivos de SUPERADMIN en el backend (LicenceTypeCatalogueController).
    create(request: CreateLicenceTypeRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateLicenceTypeRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    // Eliminación lógica (SoftDelete) -- sin endpoint de restauración en el backend, a diferencia
    // de Organizations.
    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }
}
