import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Router } from '@angular/router';
import { CurrentSessionService } from './current-session';

// Mismos mensajes de respaldo que usa la App MAUI (ServiceMessages.cs) para errores no
// vinculados a un mensaje del backend, y así mantener la experiencia consistente entre plataformas.
export const NETWORK_ERROR_MESSAGE = 'No se pudo establecer comunicación con el servidor. Verifica tu conexión a internet.';
export const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado al procesar la solicitud.';

interface AuthApiResponse {
  data: string;
  isSuccess: boolean;
  message: string;
}

export interface LoginResult {
  isSuccess: boolean;
  message: string;
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
      // El login fallido llega como error HTTP (401), no como respuesta 2xx con isSuccess:false:
      // el AuthController devuelve Unauthorized(result), así que el mensaje real del backend
      // (p.ej. "El correo electrónico o la contraseña son incorrectos.") viaja en error.error.message.
      catchError((error: HttpErrorResponse) => {
        const backendMessage = error.error?.message as string | undefined;
        const message = backendMessage || (error.status === 0 ? NETWORK_ERROR_MESSAGE : UNEXPECTED_ERROR_MESSAGE);
        return of<LoginResult>({ isSuccess: false, message });
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
