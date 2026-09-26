import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { toListResult } from '../../../../core/utils/http-result.util';
import { ApiResponse, PagedApiResponse } from '../../../../shared/models/api-response.model';
import { ListResult, OperationResult } from '../../../../shared/models/result.model';
import { SystemEvent, SystemEventType } from '../../../../shared/models/system-event.model';

@Injectable({
    providedIn: 'root'
})
export class SystemEventService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/v1/SystemEvents`;

    // Exclusivo SUPERADMIN en el backend: describe la plataforma completa, no una organización.
    list(pageNumber = 1, pageSize = 10, eventType?: SystemEventType): Observable<ListResult<SystemEvent>> {
        let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
        if (eventType) {
            params = params.set('EventType', eventType);
        }
        return toListResult(this.http.get<PagedApiResponse<SystemEvent>>(`${this.apiUrl}/pagination`, { params }));
    }

    // El backend devuelve el PDF crudo (200) o un Response<bool> en JSON (400) -- mismo criterio que
    // InvoiceService.downloadReceipt/downloadMonthlyReport: pedimos blob siempre y, si el status no
    // es 2xx, releemos ese blob como texto para sacar el mensaje real en vez de un error genérico.
    downloadReport(fromDate: string, toDate: string): Observable<OperationResult<Blob>> {
        const params = new HttpParams().set('fromDate', fromDate).set('toDate', toDate);
        return this.http.get(`${this.apiUrl}/Report`, { params, observe: 'response', responseType: 'blob' }).pipe(
            map((response) => ({ isSuccess: true, message: '', data: response.body ?? undefined }) as OperationResult<Blob>),
            catchError((error: HttpErrorResponse) => {
                const errorBlob = error.error as Blob | undefined;
                if (!(errorBlob instanceof Blob)) {
                    return of<OperationResult<Blob>>({ isSuccess: false, message: 'No se pudo descargar el informe.' });
                }
                return from(errorBlob.text()).pipe(
                    switchMap((text) => {
                        try {
                            const parsed = JSON.parse(text) as ApiResponse<unknown>;
                            return of<OperationResult<Blob>>({ isSuccess: false, message: parsed.message });
                        } catch {
                            return of<OperationResult<Blob>>({ isSuccess: false, message: 'No se pudo descargar el informe.' });
                        }
                    })
                );
            })
        );
    }
}
