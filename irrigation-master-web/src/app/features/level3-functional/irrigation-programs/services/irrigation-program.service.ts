import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { CurrentSessionService } from '../../../../core/services/current-session';
import { toDetailResult, toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { CreateIrrigationProgramRequest, IrrigationProgram, UpdateIrrigationProgramRequest } from '../../../../shared/models/irrigation-program.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class IrrigationProgramService {
    private http = inject(HttpClient);
    private currentSession = inject(CurrentSessionService);
    private apiUrl = `${environment.apiUrl}/v1/IrrigationPrograms`;

    // A diferencia de Walkways/Sectors, GetAllWithPaginationIrrigationProgramQuery exige
    // OrganizationId como parámetro explícito -- no lo resuelve del token en el propio handler.
    list(pageNumber = 1, pageSize = 10): Observable<ListResult<IrrigationProgram>> {
        const params = new HttpParams()
            .set('OrganizationId', this.currentSession.getOrganizationId() ?? '')
            .set('PageNumber', pageNumber)
            .set('PageSize', pageSize);
        return toListResult(this.http.get<PagedApiResponse<IrrigationProgram>>(`${this.apiUrl}/pagination`, { params }));
    }

    getById(id: string): Observable<DetailResult<IrrigationProgram>> {
        return toDetailResult(this.http.get<ApiResponse<IrrigationProgram>>(`${this.apiUrl}/Get/${id}`));
    }

    create(request: CreateIrrigationProgramRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    update(id: string, request: UpdateIrrigationProgramRequest): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/Update/${id}`, request));
    }

    // GetIsIrrigationDayQuery: plantilla teórica (¿debería regarse?), deliberadamente separada de
    // GetOrganizationIrrigationStatusQuery (turnos reales). `date` en formato "yyyy-MM-dd".
    isIrrigationDay(hydraulicSectorId: string, date?: string): Observable<OperationResult<boolean>> {
        let params = new HttpParams().set('HydraulicSectorId', hydraulicSectorId);
        if (date) {
            params = params.set('Date', date);
        }
        return toOperationResult(this.http.get<ApiResponse<boolean>>(`${this.apiUrl}/IsIrrigationDay`, { params }));
    }
}
