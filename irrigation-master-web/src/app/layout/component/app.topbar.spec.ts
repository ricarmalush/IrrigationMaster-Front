import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth';
import { CurrentSessionService } from '../../core/services/current-session';
import { LayoutService } from '../service/layout.service';
import { AppUser } from '../../shared/models/user.model';
import { DetailResult } from '../../shared/models/result.model';
import { UserService } from '../../features/level3-functional/users/services/user.service';
import { AppTopbar } from './app.topbar';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function base64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(role: string): string {
    const payload = { sub: 'user-1', organizationId: 'org-1', [ROLE_CLAIM]: role };
    return `header.${base64Url(JSON.stringify(payload))}.signature`;
}

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ricardo',
    lastName: 'Ruiz',
    email: 'ricardo.ruiz@gmail.com',
    organizationId: 'org-1',
    role: 'SUPERADMIN',
    isActive: true,
    fullName: 'Ricardo Ruiz',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad'
};

describe('AppTopbar', () => {
    let component: AppTopbar;
    let fixture: ComponentFixture<AppTopbar>;
    let layoutService: LayoutService;
    let currentSession: CurrentSessionService;
    let userService: jasmine.SpyObj<UserService>;
    let authService: jasmine.SpyObj<AuthService>;

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');

        if ('startViewTransition' in document) {
            spyOn(document as unknown as { startViewTransition: (cb: () => void) => unknown }, 'startViewTransition').and.callFake((callback: () => void) => {
                callback();
                return {};
            });
        }

        userService = jasmine.createSpyObj('UserService', ['getById']);
        authService = jasmine.createSpyObj('AuthService', ['logout']);

        TestBed.configureTestingModule({
            imports: [AppTopbar],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: userService },
                { provide: AuthService, useValue: authService }
            ]
        });

        fixture = TestBed.createComponent(AppTopbar);
        component = fixture.componentInstance;
        layoutService = TestBed.inject(LayoutService);
        currentSession = TestBed.inject(CurrentSessionService);
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('shows the sun icon for the light theme', () => {
        layoutService.setTheme('light');
        expect(component.themeIcon()).toBe('pi-sun');
        expect(component.themeLabel()).toBe('Tema claro');
    });

    it('shows the cloud icon for the soft theme', () => {
        layoutService.setTheme('soft');
        expect(component.themeIcon()).toBe('pi-cloud');
        expect(component.themeLabel()).toBe('Tema suave');
    });

    it('shows the moon icon for the dark theme', () => {
        layoutService.setTheme('dark');
        expect(component.themeIcon()).toBe('pi-moon');
        expect(component.themeLabel()).toBe('Tema oscuro');
    });

    it('clicking the theme action cycles the theme via the shared service order', () => {
        expect(layoutService.layoutConfig().theme).toBe('light');

        layoutService.cycleTheme();
        expect(layoutService.layoutConfig().theme).toBe('soft');
    });

    describe('profile panel', () => {
        it('does not call UserService when there is no established session', () => {
            component.ngOnInit();

            expect(userService.getById).not.toHaveBeenCalled();
            expect(component.displayName()).toBeNull();
        });

        it('fetches and shows the real display name for the logged-in user', () => {
            currentSession.establish(buildToken('SUPERADMIN'));
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: user }));

            component.ngOnInit();

            expect(userService.getById).toHaveBeenCalledWith('user-1');
            expect(component.displayName()).toBe('Ricardo Ruiz');
        });

        it('leaves displayName as null if the profile fetch fails', () => {
            currentSession.establish(buildToken('SUPERADMIN'));
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: false, message: 'No se pudo cargar' }));

            component.ngOnInit();

            expect(component.displayName()).toBeNull();
        });

        it('maps the role code to a readable label', () => {
            currentSession.establish(buildToken('PRESIDENTE'));
            expect(component.roleLabel()).toBe('Presidente');
        });

        it('falls back to the raw role code if there is no label mapped for it', () => {
            currentSession.establish(buildToken('COORDINADOR_RIEGO'));
            expect(component.roleLabel()).toBe('COORDINADOR_RIEGO');
        });

        it('shows an empty role label when there is no established session', () => {
            expect(component.roleLabel()).toBe('');
        });

        it('logout() delegates to AuthService.logout()', () => {
            component.logout();
            expect(authService.logout).toHaveBeenCalled();
        });
    });
});
