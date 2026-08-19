import { TestBed } from '@angular/core/testing';

import { CurrentSessionService } from './current-session';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function base64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Token JWT "de mentira": jwt-decode solo decodifica el payload (segunda parte), no valida la
// firma, así que header/firma pueden ser cualquier cosa siempre que existan los dos puntos.
function buildToken(payload: Record<string, unknown>): string {
    return `header.${base64Url(JSON.stringify(payload))}.signature`;
}

describe('CurrentSessionService', () => {
    let service: CurrentSessionService;

    const userId = '11111111-1111-1111-1111-111111111111';
    const organizationId = '22222222-2222-2222-2222-222222222222';
    const role = 'ADMIN';

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({});
        service = TestBed.inject(CurrentSessionService);
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('returns null for every claim before establish() is ever called', () => {
        expect(service.getUserId()).toBeNull();
        expect(service.getOrganizationId()).toBeNull();
        expect(service.getRole()).toBeNull();
    });

    describe('establish() with a valid token (mismos claims que emite JwtProvider.cs)', () => {
        beforeEach(() => {
            const token = buildToken({ sub: userId, organizationId, [ROLE_CLAIM]: role, jti: 'irrelevant' });
            service.establish(token);
        });

        it('extracts the userId claim (sub)', () => {
            expect(service.getUserId()).toBe(userId);
        });

        it('extracts the organizationId claim', () => {
            expect(service.getOrganizationId()).toBe(organizationId);
        });

        it('extracts the role claim', () => {
            expect(service.getRole()).toBe(role);
        });
    });

    it('falls back to a plain "role" claim when the long ClaimTypes.Role URI is absent', () => {
        const token = buildToken({ sub: userId, organizationId, role });
        service.establish(token);

        expect(service.getRole()).toBe(role);
    });

    it('stores empty strings for claims missing from an otherwise-valid token', () => {
        const token = buildToken({ sub: userId });
        service.establish(token);

        expect(service.getUserId()).toBe(userId);
        expect(service.getOrganizationId()).toBe('');
        expect(service.getRole()).toBe('');
    });

    it('does not throw and leaves no session data for a malformed token', () => {
        expect(() => service.establish('not-a-jwt')).not.toThrow();

        expect(service.getUserId()).toBeNull();
        expect(service.getOrganizationId()).toBeNull();
        expect(service.getRole()).toBeNull();
    });

    it('does not throw and leaves no session data for an empty token', () => {
        expect(() => service.establish('')).not.toThrow();

        expect(service.getUserId()).toBeNull();
        expect(service.getOrganizationId()).toBeNull();
        expect(service.getRole()).toBeNull();
    });

    it('does not throw for a token whose payload segment is not valid JSON', () => {
        const garbledToken = `header.${base64Url('not-json')}.signature`;

        expect(() => service.establish(garbledToken)).not.toThrow();
        expect(service.getOrganizationId()).toBeNull();
    });

    it('clear() removes a previously established session', () => {
        const token = buildToken({ sub: userId, organizationId, [ROLE_CLAIM]: role });
        service.establish(token);

        service.clear();

        expect(service.getUserId()).toBeNull();
        expect(service.getOrganizationId()).toBeNull();
        expect(service.getRole()).toBeNull();
    });

    describe('role signal (para consumidores que se construyen una sola vez, como AppMenu)', () => {
        it('starts as null when there is nothing established', () => {
            expect(service.role()).toBeNull();
        });

        it('updates the moment establish() runs, without needing a new getRole() call', () => {
            const token = buildToken({ sub: userId, organizationId, [ROLE_CLAIM]: role });

            service.establish(token);

            expect(service.role()).toBe(role);
        });

        it('stays in sync with getRole() after establish()', () => {
            const token = buildToken({ sub: userId, organizationId, [ROLE_CLAIM]: role });
            service.establish(token);

            expect(service.role()).toBe(service.getRole());
        });

        it('resets to null on clear()', () => {
            const token = buildToken({ sub: userId, organizationId, [ROLE_CLAIM]: role });
            service.establish(token);

            service.clear();

            expect(service.role()).toBeNull();
        });
    });
});
