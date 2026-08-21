import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult } from '../../../../core/utils/http-result.util';
import { PagedApiResponse } from '../../../../shared/models/api-response.model';
import { LicenceType } from '../../../../shared/models/licence-type.model';
import { ListResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class LicenceTypeService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/LicenceTypeCatalogue`;

    // Catalogo global, de lectura abierta a cualquier autenticado -- solo lo necesitamos para
    // resolver nombres en el listado de licencias asignadas y alimentar el selector de "Asignar".
    list(pageNumber = 1, pageSize = 10): Observable<ListResult<LicenceType>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<LicenceType>>(`${this.apiUrl}/pagination`, { params }));
    }
}
