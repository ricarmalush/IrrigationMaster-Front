import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { Role } from '../../../../../shared/models/role.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { RoleService } from '../../../../level1-core/roles/services/role.service';
import { UserService } from '../../services/user.service';
import { UserDetailComponent } from './user-detail.component';

const organizations: Organization[] = [
    { id: 'org-1', name: 'Comunidad', taxId: 'B1', address: { mainAddress: '', city: '', stateOrProvince: '', postalCode: '', countryId: '' }, isActive: true, created: '', createdBy: '', invitationCode: '' }
];
const roles: Role[] = [
    { id: 'role-1', name: 'Vecino', description: '', code: 'VECINO', organizationId: 'org-1', isDeleted: false },
    { id: 'role-2', name: 'Presidente', description: '', code: 'PRESIDENTE', organizationId: 'org-1', isDeleted: false }
];
const walkways: Walkway[] = [{ id: 'walkway-1', code: 'A-01', length: 100, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '' }];

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: false,
    fullName: 'Ana García',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad'
};

describe('UserDetailComponent', () => {
    let component: UserDetailComponent;
    let fixture: ComponentFixture<UserDetailComponent>;
    let userService: jasmine.SpyObj<UserService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let roleService: jasmine.SpyObj<RoleService>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null): void {
        userService = jasmine.createSpyObj('UserService', ['getById', 'create', 'update', 'activate', 'changeRole', 'assignWalkway', 'resetPassword']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: organizations, totalCount: 1 }));
        roleService = jasmine.createSpyObj('RoleService', ['list']);
        roleService.list.and.returnValue(of<ListResult<Role>>({ isSuccess: true, message: 'ok', items: roles, totalCount: 2 }));
        walkwayService = jasmine.createSpyObj('WalkwayService', ['list']);
        walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: true, message: 'ok', items: walkways, totalCount: 1 }));
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [UserDetailComponent],
            providers: [
                { provide: UserService, useValue: userService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: RoleService, useValue: roleService },
                { provide: WalkwayService, useValue: walkwayService },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(UserDetailComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    it('loads the organizations/roles/walkways catalogs on init', () => {
        setup(null);
        component.ngOnInit();

        expect(component.organizations()).toEqual(organizations);
        expect(component.roles()).toEqual(roles);
        expect(component.walkways()).toEqual(walkways);
    });

    describe('create mode', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
        });

        it('does not fetch an existing user', () => {
            expect(component.isEditMode()).toBe(false);
            expect(userService.getById).not.toHaveBeenCalled();
        });

        it('does not submit an invalid form', () => {
            component.save();

            expect(userService.create).not.toHaveBeenCalled();
        });

        it('on a valid form, creates the user and navigates back to the list', () => {
            userService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({ firstName: 'Luis', lastName: 'Pérez', email: 'luis@example.com', organizationId: 'org-1', roleId: 'role-1', password: 'Secret123!' });

            component.save();

            expect(userService.create).toHaveBeenCalledWith({ firstName: 'Luis', lastName: 'Pérez', email: 'luis@example.com', organizationId: 'org-1', roleId: 'role-1', password: 'Secret123!' });
            expect(router.navigate).toHaveBeenCalledWith(['/users']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            userService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El correo ya está en uso.' }));
            component.form.setValue({ firstName: 'Luis', lastName: 'Pérez', email: 'luis@example.com', organizationId: 'org-1', roleId: 'role-1', password: 'Secret123!' });

            component.save();

            expect(component.errorMessage()).toBe('El correo ya está en uso.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode', () => {
        beforeEach(() => {
            setup('user-1');
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: user }));
            component.ngOnInit();
        });

        it('loads the user, patches the form and exposes its status/role/walkway', () => {
            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue().firstName).toBe('Ana');
            expect(component.isActive()).toBe(false);
            expect(component.currentRole()).toBe('VECINO');
            expect(component.form.controls.roleId.disabled).toBe(true);
            expect(component.form.controls.password.disabled).toBe(true);
        });

        it('on save, calls update() with only the editable profile fields', () => {
            userService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));

            component.save();

            expect(userService.update).toHaveBeenCalledWith('user-1', { id: 'user-1', firstName: 'Ana', lastName: 'García', email: 'ana@example.com', organizationId: 'org-1' });
        });

        it('activateUser(): activates and flips isActive on success', () => {
            userService.activate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));

            component.activateUser();

            expect(userService.activate).toHaveBeenCalledWith('user-1');
            expect(component.isActive()).toBe(true);
        });

        it('changeRole(): does not call the service without a selected role', () => {
            component.changeRole();

            expect(userService.changeRole).not.toHaveBeenCalled();
            expect(component.roleActionControl.touched).toBe(true);
        });

        it('changeRole(): calls changeRole() and updates the displayed role on success', () => {
            userService.changeRole.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.roleActionControl.setValue('role-2');

            component.changeRole();

            expect(userService.changeRole).toHaveBeenCalledWith('user-1', 'role-2');
            expect(component.currentRole()).toBe('Presidente');
        });

        it('changeRole(): shows an error toast and leaves the role unchanged on failure', () => {
            userService.changeRole.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No tienes permiso para cambiar roles.' }));
            component.roleActionControl.setValue('role-2');

            component.changeRole();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No tienes permiso para cambiar roles.' }));
            expect(component.currentRole()).toBe('VECINO');
        });

        it('assignWalkway(): assigns a walkway and updates the displayed code on success', () => {
            userService.assignWalkway.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.walkwayActionControl.setValue('walkway-1');

            component.assignWalkway();

            expect(userService.assignWalkway).toHaveBeenCalledWith('user-1', 'walkway-1');
            expect(component.currentWalkwayCode()).toBe('A-01');
        });

        it('assignWalkway(): unassigns (null) when no walkway is selected', () => {
            userService.assignWalkway.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.walkwayActionControl.setValue(null);

            component.assignWalkway();

            expect(userService.assignWalkway).toHaveBeenCalledWith('user-1', null);
        });

        it('resetPassword(): does not call the service with an empty password', () => {
            component.resetPassword();

            expect(userService.resetPassword).not.toHaveBeenCalled();
            expect(component.passwordActionControl.touched).toBe(true);
        });

        it('resetPassword(): resets the password and clears the field on success', () => {
            userService.resetPassword.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.passwordActionControl.setValue('NewSecret123!');

            component.resetPassword();

            expect(userService.resetPassword).toHaveBeenCalledWith('user-1', 'NewSecret123!');
            expect(component.passwordActionControl.value).toBe('');
        });
    });
});
