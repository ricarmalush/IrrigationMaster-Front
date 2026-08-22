import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CurrentSessionService } from '../../core/services/current-session';
import { AppMenu } from './app.menu';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function base64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(role: string): string {
    const payload = { sub: 'user-1', organizationId: 'org-1', [ROLE_CLAIM]: role };
    return `header.${base64Url(JSON.stringify(payload))}.signature`;
}

function broadcastItemVisible(component: AppMenu): boolean {
    const comunidad = component.model().find((g) => g.label === 'Comunidad');
    return comunidad?.items?.some((i) => i.label === 'Avisar a mi comunidad') ?? false;
}

function itemVisible(component: AppMenu, groupLabel: string, itemLabel: string): boolean {
    const group = component.model().find((g) => g.label === groupLabel);
    return group?.items?.some((i) => i.label === itemLabel) ?? false;
}

describe('AppMenu', () => {
    let component: AppMenu;
    let fixture: ComponentFixture<AppMenu>;
    let currentSession: CurrentSessionService;

    beforeEach(() => {
        localStorage.clear();

        TestBed.configureTestingModule({
            imports: [AppMenu],
            providers: [provideRouter([])]
        });

        fixture = TestBed.createComponent(AppMenu);
        component = fixture.componentInstance;
        currentSession = TestBed.inject(CurrentSessionService);
    });

    afterEach(() => localStorage.clear());

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('always shows "Reportar incidencia" under Comunidad, regardless of role', () => {
        const comunidad = component.model().find((g) => g.label === 'Comunidad');
        expect(comunidad?.items?.some((i) => i.label === 'Reportar incidencia')).toBe(true);
    });

    it('hides "Avisar a mi comunidad" when no role is established yet', () => {
        expect(broadcastItemVisible(component)).toBe(false);
    });

    it('hides "Avisar a mi comunidad" for a VECINO', () => {
        currentSession.establish(buildToken('VECINO'));
        expect(broadcastItemVisible(component)).toBe(false);
    });

    it('shows "Avisar a mi comunidad" for SUPERADMIN', () => {
        currentSession.establish(buildToken('SUPERADMIN'));
        expect(broadcastItemVisible(component)).toBe(true);
    });

    it('shows "Avisar a mi comunidad" for PRESIDENTE', () => {
        currentSession.establish(buildToken('PRESIDENTE'));
        expect(broadcastItemVisible(component)).toBe(true);
    });

    it('shows "Avisar a mi comunidad" for VICEPRESIDENTE', () => {
        currentSession.establish(buildToken('VICEPRESIDENTE'));
        expect(broadcastItemVisible(component)).toBe(true);
    });

    // Regresión del bug reportado: el rol llega DESPUÉS de que el menú ya se haya construido
    // (AppMenu vive en el AppLayout persistente, no se reconstruye al navegar). Antes del fix,
    // el ítem se quedaba oculto para siempre aunque el rol correcto llegara justo después.
    it('reacts when the role becomes available after the menu is already built (regression)', () => {
        expect(broadcastItemVisible(component)).toBe(false);

        currentSession.establish(buildToken('SUPERADMIN'));

        expect(broadcastItemVisible(component)).toBe(true);
    });

    describe('andamiaje de navegación (espejo de AdminMenuPage de la App)', () => {
        it('always shows "Estado de Riego", "Notificaciones" and "Configuración del Sistema", regardless of role', () => {
            expect(itemVisible(component, 'Riego', 'Estado de Riego')).toBe(true);
            expect(itemVisible(component, 'Notificaciones', 'Notificaciones')).toBe(true);
            expect(itemVisible(component, 'Sistema', 'Configuración del Sistema')).toBe(true);

            currentSession.establish(buildToken('VECINO'));

            expect(itemVisible(component, 'Riego', 'Estado de Riego')).toBe(true);
            expect(itemVisible(component, 'Notificaciones', 'Notificaciones')).toBe(true);
            expect(itemVisible(component, 'Sistema', 'Configuración del Sistema')).toBe(true);
        });

        it('hides "Aprobar Turnos" for a VECINO but shows it for SUPERADMIN/PRESIDENTE/VICEPRESIDENTE', () => {
            currentSession.establish(buildToken('VECINO'));
            expect(itemVisible(component, 'Riego', 'Aprobar Turnos')).toBe(false);

            currentSession.establish(buildToken('SUPERADMIN'));
            expect(itemVisible(component, 'Riego', 'Aprobar Turnos')).toBe(true);

            currentSession.establish(buildToken('PRESIDENTE'));
            expect(itemVisible(component, 'Riego', 'Aprobar Turnos')).toBe(true);

            currentSession.establish(buildToken('VICEPRESIDENTE'));
            expect(itemVisible(component, 'Riego', 'Aprobar Turnos')).toBe(true);
        });

        it('shows "Calendario de Riego" only for SUPERADMIN/COORDINADOR_RIEGO, not for PRESIDENTE', () => {
            currentSession.establish(buildToken('PRESIDENTE'));
            expect(itemVisible(component, 'Riego', 'Calendario de Riego')).toBe(false);

            currentSession.establish(buildToken('SUPERADMIN'));
            expect(itemVisible(component, 'Riego', 'Calendario de Riego')).toBe(true);

            currentSession.establish(buildToken('COORDINADOR_RIEGO'));
            expect(itemVisible(component, 'Riego', 'Calendario de Riego')).toBe(true);
        });

        it('shows the whole "Plataforma" group with "Licencias" only for SUPERADMIN', () => {
            currentSession.establish(buildToken('SUPERADMIN'));
            expect(itemVisible(component, 'Plataforma', 'Licencias')).toBe(true);
        });

        it('omits the entire "Plataforma" group (not just the item) for PRESIDENTE', () => {
            currentSession.establish(buildToken('PRESIDENTE'));
            expect(component.model().some((g) => g.label === 'Plataforma')).toBe(false);
        });

        it('omits the entire "Plataforma" group when no role is established yet', () => {
            expect(component.model().some((g) => g.label === 'Plataforma')).toBe(false);
        });

        it('shows "Facturación" for SUPERADMIN/PRESIDENTE/COORDINADOR_RIEGO', () => {
            for (const role of ['SUPERADMIN', 'PRESIDENTE', 'COORDINADOR_RIEGO']) {
                currentSession.establish(buildToken(role));
                expect(itemVisible(component, 'Facturación', 'Facturas')).toBe(true);
            }
        });

        it('omits the entire "Facturación" group (not just the item) for VECINO, VICEPRESIDENTE or no role', () => {
            expect(component.model().some((g) => g.label === 'Facturación')).toBe(false);

            currentSession.establish(buildToken('VECINO'));
            expect(component.model().some((g) => g.label === 'Facturación')).toBe(false);

            // A diferencia de "Aprobar Turnos"/"Avisar a mi comunidad" (ADMIN_ROLES), Facturación
            // usa un conjunto de roles distinto que deliberadamente no incluye a VicePresidente.
            currentSession.establish(buildToken('VICEPRESIDENTE'));
            expect(component.model().some((g) => g.label === 'Facturación')).toBe(false);
        });
    });
});
