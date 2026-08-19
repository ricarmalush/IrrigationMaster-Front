import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult } from '../../../../core/utils/http-result.util';
import { PagedApiResponse } from '../../../../shared/models/api-response.model';
import { Country } from '../../../../shared/models/country.model';
import { ListResult } from '../../../../shared/models/result.model';

// Solo lectura: el catálogo de países lo administra SUPERADMIN desde otro sitio (o Swagger); aquí
// solo se necesita para alimentar el selector de país del alta de organización.
@Injectable({
    providedIn: 'root'
})
export class CountryService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Countries`;

    list(pageNumber = 1, pageSize = 100): Observable<ListResult<Country>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<Country>>(`${this.apiUrl}/pagination`, { params }));
    }
}
