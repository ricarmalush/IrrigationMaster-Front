import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { CreateIrrigationTurnRequest, MyWalkwayIrrigationStatus, WalkwayIrrigationStatus } from '../../../../shared/models/irrigation-turn.model';
import { DetailResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class IrrigationTurnService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/IrrigationTurns`;

    // GetOrganizationIrrigationStatusQuery: agrupado por andador via RequesterId -> User.WalkwayId
    // en el propio backend, no via HydraulicSectorId. `date` en formato "yyyy-MM-dd"; si se omite,
    // el backend usa UtcNow.Date del servidor.
    getOrganizationStatus(date?: string): Observable<DetailResult<WalkwayIrrigationStatus[]>> {
        const params = date ? new HttpParams().set('Date', date) : undefined;
        return toDetailResult(this.http.get<ApiResponse<WalkwayIrrigationStatus[]>>(`${this.apiUrl}/status`, { params }));
    }

    // GetMyWalkwayIrrigationStatusQuery: acotado SIEMPRE al andador del propio llamador (resuelto
    // vía ICurrentUser en el backend, nunca un parámetro) -- walkwayId/walkwayCode vienen null
    // cuando no tiene andador asignado (p. ej. un Presidente), estado válido, no un error.
    // Complementa -- no sustituye -- getOrganizationStatus() (vista hermana, org-wide, solo hoy):
    // esta además incluye las solicitudes para mañana. `date` opcional en formato "yyyy-MM-dd";
    // si se omite, el backend usa UtcNow.Date del servidor ("mañana" es date+1, resuelto ahí).
    getMyWalkwayStatus(date?: string): Observable<DetailResult<MyWalkwayIrrigationStatus>> {
        const params = date ? new HttpParams().set('Date', date) : undefined;
        return toDetailResult(this.http.get<ApiResponse<MyWalkwayIrrigationStatus>>(`${this.apiUrl}/my-walkway-status`, { params }));
    }

    // "Solicitar mi turno". Sin validación de día/temporada en el backend -- lo comprobamos en el
    // cliente antes de ofrecer el botón (ver IsIrrigationDay en IrrigationProgramService).
    request(request: CreateIrrigationTurnRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    // "Empezar mi turno" / "Cancelar" / "Terminar mi turno". Autorización del backend: propio
    // andador (o MANAGE_ANY_TURN/SUPERADMIN) -- el Front solo ofrece el botón en la fila propia,
    // coincide. cancel() solo tiene efecto mientras el turno sigue en Requested (el backend lo
    // rechaza explícitamente en cualquier otro estado) -- motivo siempre fijo, sin texto libre.
    start(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/start`, null));
    }

    cancel(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/cancel`, null));
    }

    complete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/complete`, null));
    }
}
