import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { CreateIrrigationTurnRequest, PendingApprovalTurn, WalkwayIrrigationStatus } from '../../../../shared/models/irrigation-turn.model';
import { DetailResult, OperationResult } from '../../../../shared/models/result.model';

@Injectable({
    providedIn: 'root'
})
export class IrrigationTurnService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/IrrigationTurns`;

    // GetPendingApprovalIrrigationTurnsQuery no pagina -- devuelve un array plano dentro de
    // Response<T>, no ResponsePagination<T> -- por eso DetailResult<T[]> en vez de ListResult<T>.
    listPendingApproval(): Observable<DetailResult<PendingApprovalTurn[]>> {
        return toDetailResult(this.http.get<ApiResponse<PendingApprovalTurn[]>>(`${this.apiUrl}/pending-approval`));
    }

    // Sin reject(): el backend no lo expone (ni comando, ni ruta -- ver Cancel() en el dominio,
    // inalcanzable desde la API).
    approve(id: string): Observable<OperationResult<string>> {
        return toOperationResult(this.http.patch<ApiResponse<string>>(`${this.apiUrl}/${id}/approve`, null));
    }

    // GetOrganizationIrrigationStatusQuery: agrupado por andador via RequesterId -> User.WalkwayId
    // en el propio backend, no via HydraulicSectorId. `date` en formato "yyyy-MM-dd"; si se omite,
    // el backend usa UtcNow.Date del servidor.
    getOrganizationStatus(date?: string): Observable<DetailResult<WalkwayIrrigationStatus[]>> {
        const params = date ? new HttpParams().set('Date', date) : undefined;
        return toDetailResult(this.http.get<ApiResponse<WalkwayIrrigationStatus[]>>(`${this.apiUrl}/status`, { params }));
    }

    // "Solicitar mi turno". Sin validación de día/temporada en el backend -- lo comprobamos en el
    // cliente antes de ofrecer el botón (ver IsIrrigationDay en IrrigationProgramService).
    request(request: CreateIrrigationTurnRequest): Observable<OperationResult<string>> {
        return toOperationResult(this.http.post<ApiResponse<string>>(`${this.apiUrl}/Create`, request));
    }

    // "Empezar mi turno" / "Terminar mi turno". Autorización del backend: propio andador (o
    // MANAGE_ANY_TURN/SUPERADMIN) -- el Front solo ofrece el botón en la fila propia, coincide.
    start(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/start`, null));
    }

    complete(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.patch<ApiResponse<boolean>>(`${this.apiUrl}/${id}/complete`, null));
    }
}
