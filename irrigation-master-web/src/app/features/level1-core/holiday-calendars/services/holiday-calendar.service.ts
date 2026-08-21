import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateHolidayCalendarRequest, HolidayCalendar, UpdateHolidayCalendarRequest } from '../../../../shared/models/holiday-calendar.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class HolidayCalendarService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/HolidayCalendars`;

    // GetAllWithPaginationHolidayQuery resuelve el tenant vía el filtro global de EF (JWT), igual
    // que Walkways/Sectors -- no exige OrganizationId explícito (a diferencia de Programs).
    list(pageNumber = 1, pageSize = 10): Observable<ListResult<HolidayCalendar>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<HolidayCalendar>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<HolidayCalendar>> {
        return toDetailResult(this.http.get<ApiResponse<HolidayCalendar>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateHolidayCalendarRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateHolidayCalendarRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    delete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.delete<ApiResponse<boolean>>(`${this.apiUrl}/Delete/${id}`));
    }
}
