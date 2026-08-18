import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // 1. AJUSTE DE RUTA: Añadimos el /v1/ para que coincida con tu [ApiVersion("1.0")]
  private apiUrl = `${environment.apiUrl}/v1/Auth/Login`;

  login(email: string, password: string) {
    // Angular convierte esto a JSON y C# lo mapea automáticamente a tu LoginQuery
    return this.http.post<any>(this.apiUrl, { email, password }).pipe(
      tap(response => {
        // 2. AJUSTE DE RESPUESTA: Leemos el 'data' dentro de tu Response<string>
        if (response && response.isSuccess) {
          localStorage.setItem('jwt_token', response.data);
        }
      })
    );
  }

  getToken() {
    return localStorage.getItem('jwt_token');
  }

  logout() {
    localStorage.removeItem('jwt_token');
    this.router.navigate(['/login']);
  }
}
