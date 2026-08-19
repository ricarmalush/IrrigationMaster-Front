import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult } from '../../../../core/utils/http-result.util';
import { PagedApiResponse } from '../../../../shared/models/api-response.model';
import { Role } from '../../../../shared/models/role.model';
import { ListResult } from '../../../../shared/models/result.model';

// Solo lectura: no hay gestión de roles en este panel todavía, solo se necesita para alimentar el
// selector de rol del alta/edición de usuarios (Users/Create, Users/ChangeRole).
@Injectable({
    providedIn: 'root'
})
export class RoleService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Roles`;

    list(pageNumber = 1, pageSize = 100): Observable<ListResult<Role>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<Role>>(`${this.apiUrl}/pagination`, { params }));
    }
}
