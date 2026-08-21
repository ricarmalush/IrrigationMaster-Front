import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult, toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { AppNotification } from '../../../../shared/models/notification.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';

// Título/tipo fijos, igual que en la App (CommunityBroadcastViewModel): "Avisar a mi comunidad"
// solo pide el mensaje, el backend exige Title/Type no vacíos en SendNotificationCommand.
const BROADCAST_TITLE = 'Aviso de tu comunidad';
const BROADCAST_TYPE = 'Info';

export type BroadcastAudience = 'Walkway' | 'Organization';

interface SendNotificationApiRequest {
    audience: BroadcastAudience;
    title: string;
    message: string;
    type: string;
    targetWalkwayId?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/Notifications`;

    // Sin destino: el backend resuelve siempre como destinatarios a quien tenga MANAGE_INCIDENTS
    // en su rol, dentro de la propia organización del emisor.
    reportIncident(message: string): Observable<OperationResult<number>> {
        return toOperationResult(this.http.post<ApiResponse<number>>(`${this.apiUrl}/ReportIncident`, { message }));
    }

    // Espejo de CommunityBroadcastViewModel: audiencia "Mi andador" (si el emisor tiene uno
    // asignado) o "Toda mi organización", igual que el Picker de la App.
    send(message: string, audience: BroadcastAudience, targetWalkwayId?: string): Observable<OperationResult<number>> {
        const request: SendNotificationApiRequest = { audience, title: BROADCAST_TITLE, message, type: BROADCAST_TYPE };
        if (audience === 'Walkway' && targetWalkwayId) {
            request.targetWalkwayId = targetWalkwayId;
        }
        return toOperationResult(this.http.post<ApiResponse<number>>(`${this.apiUrl}/Send`, request));
    }

    // GetMyNotificationsQuery: sin permiso adicional, resuelve UserId/OrganizationId del token --
    // a diferencia de pending-approval de Turnos, esta sí pagina de verdad en el servidor.
    listMine(pageNumber = 1, pageSize = 10, unreadOnly = false): Observable<ListResult<AppNotification>> {
        const params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize).set('UnreadOnly', unreadOnly);
        return toListResult(this.http.get<PagedApiResponse<AppNotification>>(`${this.apiUrl}/Mine`, { params }));
    }

    // Ownership verificado en servidor (UserId == caller) -- un fallo por notificación ajena llega
    // como isSuccess:false con HTTP 200, no como 404; toOperationResult ya lo maneja igual.
    markAsRead(id: string): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/MarkAsRead/${id}`, null));
    }

    markAllAsRead(): Observable<OperationResult<boolean>> {
        return toOperationResult(this.http.put<ApiResponse<boolean>>(`${this.apiUrl}/MarkAllAsRead`, null));
    }
}
