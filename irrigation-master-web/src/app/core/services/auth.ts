import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { CurrentSessionService } from './current-session';
import { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../constants/service-messages';

export { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE };

interface AuthApiResponse {
  data: string;
  isSuccess: boolean;
  message: string;
}

export interface LoginResult {
  isSuccess: boolean;
  message: string;
  // true solo cuando el backend respondió 402 (GlobalMessages.NoActiveLicence): ni la
  // organización ni el propio usuario tienen una licencia vigente. Distinto de un 401 de
  // credenciales/cuenta inactiva -- el componente de login lo usa para diferenciar visualmente
  // "contacta con soporte" de un simple error de autenticación.
  isLicenceError?: boolean;
  // true solo cuando el backend respondió 403 (GlobalMessages.AccountDeactivated): la cuenta fue
  // suspendida deliberadamente por un administrador. Distinto del 401 genérico (credenciales
  // inválidas o pendiente de aprobación, que siguen devolviendo 401 sin cambios) y del 402 de
  // licencia -- el componente de login lo usa para mostrar su propio mensaje.
  isAccountDeactivatedError?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private currentSession = inject(CurrentSessionService);

  // 1. AJUSTE DE RUTA: Añadimos el /v1/ para que coincida con tu [ApiVersion("1.0")]
  private apiUrl = `${environment.apiUrl}/v1/Auth/Login`;

  login(email: string, password: string): Observable<LoginResult> {
    // Angular convierte esto a JSON y C# lo mapea automáticamente a tu LoginQuery
    return this.http.post<AuthApiResponse>(this.apiUrl, { email, password }).pipe(
      tap((response) => {
        // 2. AJUSTE DE RESPUESTA: Leemos el 'data' dentro de tu Response<string>
        if (response?.isSuccess && response.data) {
          localStorage.setItem('jwt_token', response.data);
          this.currentSession.establish(response.data);
        }
      }),
      map((response) => ({ isSuccess: response.isSuccess, message: response.message }) as LoginResult),
      // El login fallido llega como error HTTP (401 o 402), no como respuesta 2xx con
      // isSuccess:false: el AuthController devuelve Unauthorized(result) o, para el caso de
      // licencia (GlobalMessages.NoActiveLicence), StatusCode(402, result) -- en ambos casos el
      // mensaje real del backend viaja en error.error.message.
      catchError((error: HttpErrorResponse) => {
        const backendMessage = error.error?.message as string | undefined;
        const message = backendMessage || (error.status === 0 ? NETWORK_ERROR_MESSAGE : UNEXPECTED_ERROR_MESSAGE);
        return of<LoginResult>({ isSuccess: false, message, isLicenceError: error.status === 402, isAccountDeactivatedError: error.status === 403 });
      })
    );
  }

  getToken() {
    return localStorage.getItem('jwt_token');
  }

  logout() {
    localStorage.removeItem('jwt_token');
    this.currentSession.clear();
    this.router.navigate(['/login']);
  }
}
