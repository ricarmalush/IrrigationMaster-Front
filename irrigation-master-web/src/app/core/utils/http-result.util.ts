import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiResponse, PagedApiResponse } from '../../shared/models/api-response.model';
import { DetailResult, ListResult, OperationResult } from '../../shared/models/result.model';
import { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../constants/service-messages';

// Misma lógica que AuthService.login(): mensaje real del backend si lo hay (viaja en
// error.error.message en los 400/401/404 -- ver Response<T> del backend), si no un mensaje de
// red cuando la petición no llega al servidor (status 0), y si no un mensaje genérico.
export function extractErrorMessage(error: HttpErrorResponse): string {
    const backendMessage = error.error?.message as string | undefined;
    return backendMessage || (error.status === 0 ? NETWORK_ERROR_MESSAGE : UNEXPECTED_ERROR_MESSAGE);
}

// Normaliza una llamada de escritura (create/update/delete/activate...) a un OperationResult que
// nunca lanza: éxito o fallo, siempre con isSuccess + message (real del backend o de respaldo).
export function toOperationResult<T = void>(source: Observable<ApiResponse<T>>): Observable<OperationResult<T>> {
    return source.pipe(
        map((response) => ({ isSuccess: response.isSuccess, message: response.message, data: response.data }) as OperationResult<T>),
        catchError((error: HttpErrorResponse) => of<OperationResult<T>>({ isSuccess: false, message: extractErrorMessage(error) }))
    );
}

// Igual que toOperationResult, para un Get/{id}: la ausencia (404) también resuelve, no lanza.
export function toDetailResult<T>(source: Observable<ApiResponse<T>>): Observable<DetailResult<T>> {
    return source.pipe(
        map((response) => ({ isSuccess: response.isSuccess, message: response.message, data: response.data }) as DetailResult<T>),
        catchError((error: HttpErrorResponse) => of<DetailResult<T>>({ isSuccess: false, message: extractErrorMessage(error) }))
    );
}

// Igual que las anteriores, para un listado paginado: una lista vacía es éxito con items: [].
export function toListResult<T>(source: Observable<PagedApiResponse<T>>): Observable<ListResult<T>> {
    return source.pipe(
        map(
            (response) =>
                ({
                    isSuccess: response.isSuccess,
                    message: response.message,
                    items: response.data ?? [],
                    totalCount: response.totalCount
                }) as ListResult<T>
        ),
        catchError((error: HttpErrorResponse) => of<ListResult<T>>({ isSuccess: false, message: extractErrorMessage(error), items: [], totalCount: 0 }))
    );
}
