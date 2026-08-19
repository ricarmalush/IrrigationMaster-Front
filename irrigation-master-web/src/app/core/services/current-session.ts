import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

// El backend firma el rol con el claim estándar de .NET ClaimTypes.Role, que se serializa como
// esta URI larga (no como "role"). Ver IrrigationMaster.Infrastructure/Security/JwtProvider.cs.
const ROLE_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role';

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
    establish(token: string): void {
        const claims = this.decode(token);
        if (!claims) {
            return;
        }

        localStorage.setItem(USER_ID_KEY, claims.userId);
        localStorage.setItem(ORGANIZATION_ID_KEY, claims.organizationId);
        localStorage.setItem(ROLE_KEY, claims.role);
    }

    getUserId(): string | null {
        return localStorage.getItem(USER_ID_KEY);
    }

    getOrganizationId(): string | null {
        return localStorage.getItem(ORGANIZATION_ID_KEY);
    }

    getRole(): string | null {
        return localStorage.getItem(ROLE_KEY);
    }

    clear(): void {
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(ORGANIZATION_ID_KEY);
        localStorage.removeItem(ROLE_KEY);
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
