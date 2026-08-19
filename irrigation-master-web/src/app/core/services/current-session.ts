import { Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

// El backend firma el rol con el claim estándar de .NET ClaimTypes.Role, que se serializa como
// esta URI larga (no como "role"). Ver IrrigationMaster.Infrastructure/Security/JwtProvider.cs.
// OJO: es la URI de schemas.microsoft.com/.../2008/06/... -- NO la de schemas.xmlsoap.org/.../2005/05/...
// que usan el resto de claims estándar (name, email, nameidentifier...). Confirmado decodificando
// un JWT real emitido por el backend (no es un dato de la documentación de .NET, es el valor
// real que el propio JwtProvider produce en producción).
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

const USER_ID_KEY = 'user_id';
const ORGANIZATION_ID_KEY = 'organization_id';
const ROLE_KEY = 'user_role';

interface JwtClaims {
    sub?: string;
    organizationId?: string;
    [claim: string]: unknown;
}

export interface SessionInfo {
    userId: string;
    organizationId: string;
    role: string;
}

// Equivalente web de ICurrentSession/CurrentSession en la App MAUI: única fuente de verdad
// sobre "quién soy / de qué organización soy", para que nada fuera de aquí decodifique el JWT.
@Injectable({
    providedIn: 'root'
})
export class CurrentSessionService {
    // Señal reactiva del rol -- además de getRole(). La necesitan consumidores que se construyen
    // una sola vez por sesión (p. ej. AppMenu, que vive dentro del AppLayout persistente y no se
    // reconstruye al navegar, a diferencia de las páginas de listado): si dependieran de un valor
    // leído una única vez, un rol que tardara en estar disponible en ese instante exacto se
    // quedaría congelado -- oculto -- el resto de la sesión. Con la señal, se recalculan solos en
    // cuanto el rol cambia.
    readonly role = signal<string | null>(localStorage.getItem(ROLE_KEY));

    establish(token: string): void {
        const claims = this.decode(token);
        if (!claims) {
            return;
        }

        localStorage.setItem(USER_ID_KEY, claims.userId);
        localStorage.setItem(ORGANIZATION_ID_KEY, claims.organizationId);
        localStorage.setItem(ROLE_KEY, claims.role);
        this.role.set(claims.role);
    }

    getUserId(): string | null {
        return localStorage.getItem(USER_ID_KEY);
    }

    getOrganizationId(): string | null {
        return localStorage.getItem(ORGANIZATION_ID_KEY);
    }

    getRole(): string | null {
        return this.role();
    }

    clear(): void {
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(ORGANIZATION_ID_KEY);
        localStorage.removeItem(ROLE_KEY);
        this.role.set(null);
    }

    private decode(token: string): SessionInfo | null {
        if (!token) {
            return null;
        }

        try {
            const payload = jwtDecode<JwtClaims>(token);
            return {
                userId: payload.sub ?? '',
                organizationId: payload.organizationId ?? '',
                role: (payload[ROLE_CLAIM] as string | undefined) ?? (payload['role'] as string | undefined) ?? ''
            };
        } catch {
            return null;
        }
    }
}
