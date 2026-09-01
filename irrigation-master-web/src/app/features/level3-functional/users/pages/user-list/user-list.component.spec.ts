import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../services/user.service';
import { UserListComponent } from './user-list.component';

const activeUser: AppUser = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: true,
    fullName: 'Ana García',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad'
};

const pendingUser: AppUser = { ...activeUser, id: 'user-2', isActive: false, fullName: 'Luis Pérez', deactivatedAt: null };

const deactivatedUser: AppUser = { ...activeUser, id: 'user-3', isActive: false, fullName: 'Marta Ruiz', deactivatedAt: '2026-01-15T10:00:00Z', deactivatedBy: 'admin-1' };

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B123',
    address: { mainAddress: 'x', city: 'Sevilla', stateOrProvince: 'SE', postalCode: '41001', countryId: 'c1' },
    isActive: true,
    created: '2026-01-01',
    createdBy: 'system',
    invitationCode: 'ABC'
};

describe('UserListComponent', () => {
    let component: UserListComponent;
    let fixture: ComponentFixture<UserListComponent>;
    let userService: jasmine.SpyObj<UserService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    function setup(role: string | null): void {
        userService = jasmine.createSpyObj('UserService', ['list', 'delete', 'activate', 'deactivate']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [UserListComponent],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: userService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(UserListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    describe('gating por rol (columna y selector de Organización)', () => {
        it('SUPERADMIN: isSuperAdmin es true', () => {
            setup('SUPERADMIN');
            expect(component.isSuperAdmin).toBe(true);
        });

        it('cualquier otro rol: isSuperAdmin es false', () => {
            setup('PRESIDENTE');
            expect(component.isSuperAdmin).toBe(false);
        });
    });

    describe('ngOnInit()', () => {
        it('SUPERADMIN: carga el catálogo de organizaciones', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(organizationService.list).toHaveBeenCalled();
            expect(component.organizations()).toEqual([organization]);
        });

        it('cualquier otro rol: no carga el catálogo de organizaciones (no lo necesita)', () => {
            setup('PRESIDENTE');

            component.ngOnInit();

            expect(organizationService.list).not.toHaveBeenCalled();
        });

        // Regresión: un permiso denegado en esta llamada dejaba el selector de organización vacío
        // en silencio, indistinguible de "no hay organizaciones" (mismo bug que VIEW_HYDRAULIC_SECTORS).
        it('SUPERADMIN: surfaces the error message when the organization catalog fails to load', () => {
            setup('SUPERADMIN');
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: false, message: 'No tienes permiso para ver organizaciones.', items: [], totalCount: 0 }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No tienes permiso para ver organizaciones.');
        });

        it('organizationFilterOptions() antepone "Todas las organizaciones" (value:null) a las cargadas', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.organizationFilterOptions()).toEqual([
                { label: 'Todas las organizaciones', value: null },
                { label: 'Comunidad de Regantes', value: 'org-1' }
            ]);
        });
    });

    describe('onLazyLoad()', () => {
        it('loads a page and exposes the items/total on success', () => {
            setup('SUPERADMIN');
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [activeUser], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(userService.list).toHaveBeenCalledWith(1, 10, undefined, undefined);
            expect(component.users()).toEqual([activeUser]);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            setup('SUPERADMIN');
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.users()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message on failure', () => {
            setup('SUPERADMIN');
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    it('onActiveFilterChange(): resets to the first page and refetches with the selected filter', () => {
        setup('SUPERADMIN');
        userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [pendingUser], totalCount: 1 }));
        component.onLazyLoad({ first: 20, rows: 10 });

        component.activeFilter.set(false);
        component.onActiveFilterChange();

        expect(userService.list).toHaveBeenCalledWith(1, 10, false, undefined);
    });

    describe('onOrganizationFilterChange()', () => {
        beforeEach(() => {
            setup('SUPERADMIN');
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        });

        it('resets to the first page and sends the selected organizationId', () => {
            component.onLazyLoad({ first: 20, rows: 10 });

            component.organizationFilter.set('org-1');
            component.onOrganizationFilterChange();

            expect(userService.list).toHaveBeenCalledWith(1, 10, undefined, 'org-1');
        });

        it('"Todas las organizaciones" (null) omits the OrganizationId filter (undefined)', () => {
            component.organizationFilter.set('org-1');
            component.onOrganizationFilterChange();

            component.organizationFilter.set(null);
            component.onOrganizationFilterChange();

            expect(userService.list).toHaveBeenCalledWith(1, 10, undefined, undefined);
        });

        it('combina correctamente con activeFilter -- ambos filtros se envían a la vez', () => {
            component.activeFilter.set(true);
            component.onActiveFilterChange();

            component.organizationFilter.set('org-1');
            component.onOrganizationFilterChange();

            expect(userService.list).toHaveBeenCalledWith(1, 10, true, 'org-1');
        });
    });

    describe('confirmDeactivate()', () => {
        // Distinto de userService.delete() (borrado lógico): el botón "Desactivar" ya existía en
        // la fila pero estaba mal cableado -- ahora llama a PUT /Users/Deactivate/{id} (suspensión
        // deliberada, reversible, conserva historial).
        it('asks for confirmation, and on accept calls userService.deactivate() (not delete) + reloads the list', () => {
            setup('SUPERADMIN');
            userService.deactivate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDeactivate(activeUser);

            expect(userService.deactivate).toHaveBeenCalledWith('user-1');
            expect(userService.delete).not.toHaveBeenCalled();
            expect(userService.list).toHaveBeenCalled();
        });
    });

    describe('status() / statusLabel() / statusSeverity()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('is "Activo" (success) when isActive is true', () => {
            expect(component.statusLabel(activeUser)).toBe('Activo');
            expect(component.statusSeverity(activeUser)).toBe('success');
        });

        it('is "Pendiente" (warn) when isActive is false and deactivatedAt is null (nunca aprobado)', () => {
            expect(component.statusLabel(pendingUser)).toBe('Pendiente');
            expect(component.statusSeverity(pendingUser)).toBe('warn');
        });

        it('is "Desactivado" (secondary) when isActive is false and deactivatedAt has a value (suspendido por un admin)', () => {
            expect(component.statusLabel(deactivatedUser)).toBe('Desactivado');
            expect(component.statusSeverity(deactivatedUser)).toBe('secondary');
        });
    });

    describe('activate()', () => {
        it('activates the user and reloads the list on success', () => {
            setup('SUPERADMIN');
            userService.activate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.activate(pendingUser);

            expect(userService.activate).toHaveBeenCalledWith('user-2');
            expect(userService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when activation fails', () => {
            setup('SUPERADMIN');
            userService.activate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No tienes permiso para aprobar usuarios.' }));

            component.activate(pendingUser);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No tienes permiso para aprobar usuarios.' }));
            expect(userService.list).not.toHaveBeenCalled();
        });
    });
});
