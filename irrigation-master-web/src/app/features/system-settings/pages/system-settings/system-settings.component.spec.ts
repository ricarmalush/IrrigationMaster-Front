import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../core/services/current-session';
import { Organization } from '../../../../shared/models/organization.model';
import { DetailResult, OperationResult } from '../../../../shared/models/result.model';
import { OrganizationService } from '../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../level3-functional/users/services/user.service';
import { SystemSettingsComponent } from './system-settings.component';

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B123',
    address: { mainAddress: 'x', city: 'Sevilla', stateOrProvince: 'SE', postalCode: '41001', countryId: 'c1' },
    isActive: true,
    created: '2026-01-01',
    createdBy: 'system',
    invitationCode: 'ABC123'
};

describe('SystemSettingsComponent', () => {
    let component: SystemSettingsComponent;
    let fixture: ComponentFixture<SystemSettingsComponent>;
    let userService: jasmine.SpyObj<UserService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    function setup(role: string | null): void {
        userService = jasmine.createSpyObj('UserService', ['changePassword']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['getById', 'regenerateInvitationCode']);
        organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: true, message: 'ok', data: organization }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole', 'getOrganizationId']);
        currentSession.getRole.and.returnValue(role);
        currentSession.getOrganizationId.and.returnValue('org-1');
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [SystemSettingsComponent],
            providers: [
                provideRouter([]),
                { provide: UserService, useValue: userService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(SystemSettingsComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes canRegenerateCode as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.canRegenerateCode).toBe(true);
    });

    it('exposes canRegenerateCode as true for PRESIDENTE', () => {
        setup('PRESIDENTE');
        expect(component.canRegenerateCode).toBe(true);
    });

    it('exposes canRegenerateCode as true for VICEPRESIDENTE', () => {
        setup('VICEPRESIDENTE');
        expect(component.canRegenerateCode).toBe(true);
    });

    it('exposes canRegenerateCode as false for a role without the seeded permission', () => {
        setup('VECINO');
        expect(component.canRegenerateCode).toBe(false);
    });

    describe('ngOnInit()', () => {
        it('loads the organization name and invitation code', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.organizationName()).toBe('Comunidad de Regantes');
            expect(component.invitationCode()).toBe('ABC123');
        });

        it('surfaces the backend error message on failure', () => {
            setup('SUPERADMIN');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: false, message: 'No se encontró la organización.' }));

            component.ngOnInit();

            expect(component.organizationErrorMessage()).toBe('No se encontró la organización.');
        });
    });

    describe('confirmRegenerateCode() / regenerateCode()', () => {
        it('does nothing when canRegenerateCode is false', () => {
            setup('VECINO');

            component.confirmRegenerateCode();

            expect(confirmationService.confirm).not.toHaveBeenCalled();
        });

        it('asks for confirmation, and on accept regenerates the code and shows a success toast', () => {
            setup('SUPERADMIN');
            organizationService.regenerateInvitationCode.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'NEWCODE' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmRegenerateCode();

            expect(organizationService.regenerateInvitationCode).toHaveBeenCalledWith('org-1');
            expect(component.invitationCode()).toBe('NEWCODE');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
        });

        it('shows an error toast and keeps the old code when regeneration fails', () => {
            setup('SUPERADMIN');
            organizationService.regenerateInvitationCode.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());
            component.ngOnInit();

            component.confirmRegenerateCode();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No tienes permiso para realizar esta acción.' }));
            expect(component.invitationCode()).toBe('ABC123');
        });
    });

    describe('changePassword()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('does not submit an invalid (empty) form', () => {
            component.changePassword();

            expect(userService.changePassword).not.toHaveBeenCalled();
            expect(component.passwordForm.controls.currentPassword.touched).toBe(true);
        });

        it('does not submit when the new password and confirmation do not match', () => {
            component.passwordForm.setValue({ currentPassword: 'old-pass', newPassword: 'new-password', confirmNewPassword: 'different' });

            component.changePassword();

            expect(userService.changePassword).not.toHaveBeenCalled();
            expect(component.passwordForm.errors?.['passwordMismatch']).toBe(true);
        });

        it('on a valid form, changes the password and resets the form on success', () => {
            userService.changePassword.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Contraseña actualizada con éxito.' }));
            component.passwordForm.setValue({ currentPassword: 'old-pass', newPassword: 'new-password', confirmNewPassword: 'new-password' });

            component.changePassword();

            expect(userService.changePassword).toHaveBeenCalledWith({ currentPassword: 'old-pass', newPassword: 'new-password', confirmNewPassword: 'new-password' });
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Contraseña actualizada con éxito.' }));
            expect(component.passwordForm.value.currentPassword).toBeFalsy();
        });

        it('on a backend failure (contraseña actual incorrecta), shows the real message and does not reset the form', () => {
            userService.changePassword.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'La contraseña actual no es correcta.' }));
            component.passwordForm.setValue({ currentPassword: 'wrong-pass', newPassword: 'new-password', confirmNewPassword: 'new-password' });

            component.changePassword();

            expect(component.passwordErrorMessage()).toBe('La contraseña actual no es correcta.');
            expect(component.passwordForm.value.currentPassword).toBe('wrong-pass');
        });
    });
});
