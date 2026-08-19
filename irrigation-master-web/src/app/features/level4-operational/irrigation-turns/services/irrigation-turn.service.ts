import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toDetailResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { PendingApprovalTurn } from '../../../../shared/models/irrigation-turn.model';
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
}
