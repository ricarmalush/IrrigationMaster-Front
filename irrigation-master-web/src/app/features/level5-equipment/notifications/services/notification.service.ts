import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toOperationResult } from '../../../../core/utils/http-result.util';
import { ApiResponse } from '../../../../shared/models/api-response.model';
import { OperationResult } from '../../../../shared/models/result.model';

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
}
