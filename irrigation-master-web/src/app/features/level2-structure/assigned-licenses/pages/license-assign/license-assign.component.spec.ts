import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { AssignedLicenseService } from '../../services/assigned-license.service';
import { LicenseAssignComponent } from './license-assign.component';

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

const licenceType: LicenceType = {
    id: 'licence-type-1',
    name: 'Plan Operativo Profesional',
    licenseCode: 'LIC-OP-004',
    description: 'x',
    durationInDays: 365,
    priceAmount: 149.99,
    priceCurrency: 'USD',
    isUsageBased: false,
    maxLevelAllowed: 'Operational',
    isDeleted: false,
    created: '2026-01-01'
};

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ricardo',
    lastName: 'Ruiz',
    email: 'ricardo@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: true,
    fullName: 'Ricardo Ruiz',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad de Regantes'
};

describe('LicenseAssignComponent', () => {
    let component: LicenseAssignComponent;
    let fixture: ComponentFixture<LicenseAssignComponent>;
    let licenseService: jasmine.SpyObj<AssignedLicenseService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let userService: jasmine.SpyObj<UserService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(): void {
        licenseService = jasmine.createSpyObj('AssignedLicenseService', ['create']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 }));
        userService = jasmine.createSpyObj('UserService', ['list']);
        userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [user], totalCount: 1 }));
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [LicenseAssignComponent],
            providers: [
                { provide: AssignedLicenseService, useValue: licenseService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: UserService, useValue: userService },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(LicenseAssignComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup();
        expect(component).toBeTruthy();
    });

    it('loads organizations and licence types on init', () => {
        setup();

        component.ngOnInit();

        expect(component.organizations()).toEqual([organization]);
        expect(component.licenceTypes()).toEqual([licenceType]);
    });

    it('defaults scope to "organization" and does not load users on init', () => {
        setup();

        component.ngOnInit();

        expect(component.form.controls.scope.value).toBe('organization');
        expect(userService.list).not.toHaveBeenCalled();
    });

    it('onLicenceTypeChange() sets durationDays from the selected licence type default', () => {
        setup();
        component.ngOnInit();

        component.onLicenceTypeChange('licence-type-1');

        expect(component.form.controls.durationDays.value).toBe(365);
    });

    it('does not submit an invalid (empty) form', () => {
        setup();
        component.ngOnInit();
        component.form.patchValue({ durationDays: 0 });

        component.save();

        expect(licenseService.create).not.toHaveBeenCalled();
        expect(component.form.controls.organizationId.touched).toBe(true);
    });

    it('on a valid organization-scoped form, creates the license with userId:null and navigates back to the list', () => {
        setup();
        component.ngOnInit();
        licenseService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-license-id' }));
        component.form.patchValue({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });

        component.save();

        expect(licenseService.create).toHaveBeenCalledWith({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365, userId: null });
        expect(router.navigate).toHaveBeenCalledWith(['/licences']);
    });

    it('on a 400 with a real backend validation message, shows it and does not navigate', () => {
        setup();
        component.ngOnInit();
        licenseService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La organización ya tiene una licencia activa.' }));
        component.form.patchValue({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });

        component.save();

        expect(component.errorMessage()).toBe('La organización ya tiene una licencia activa.');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('cancel() navigates back to the list', () => {
        setup();

        component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/licences']);
    });

    describe('onOrganizationChange()', () => {
        beforeEach(() => {
            setup();
            component.ngOnInit();
        });

        it('clears the previously selected user and the users catalog', () => {
            component.form.controls.userId.setValue('user-1');
            component.users.set([user]);

            component.onOrganizationChange('org-1');

            expect(component.form.controls.userId.value).toBe('');
        });

        it('does not load users when scope is "organization"', () => {
            component.onOrganizationChange('org-1');

            expect(userService.list).not.toHaveBeenCalled();
        });

        it('reloads users filtered by the new organization when scope is "individual"', () => {
            component.form.controls.scope.setValue('individual');

            component.onOrganizationChange('org-1');

            expect(userService.list).toHaveBeenCalledWith(1, 100, undefined, 'org-1');
            expect(component.users()).toEqual([user]);
        });
    });

    describe('onScopeChange()', () => {
        beforeEach(() => {
            setup();
            component.ngOnInit();
        });

        it('switching to "organization" clears the selected user and the users catalog', () => {
            component.form.controls.userId.setValue('user-1');
            component.users.set([user]);

            component.onScopeChange('organization');

            expect(component.form.controls.userId.value).toBe('');
            expect(component.users()).toEqual([]);
        });

        it('switching to "individual" with an organization already chosen loads its users', () => {
            component.form.controls.organizationId.setValue('org-1');

            component.onScopeChange('individual');

            expect(userService.list).toHaveBeenCalledWith(1, 100, undefined, 'org-1');
            expect(component.users()).toEqual([user]);
        });

        it('switching to "individual" with no organization chosen yet does not call the service', () => {
            component.onScopeChange('individual');

            expect(userService.list).not.toHaveBeenCalled();
        });
    });

    describe('flujo individual completo', () => {
        beforeEach(() => {
            setup();
            component.ngOnInit();
            component.form.controls.scope.setValue('individual');
            component.form.patchValue({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });
        });

        it('does not submit when scope is "individual" and no user is selected, even if the rest of the form is valid', () => {
            component.save();

            expect(licenseService.create).not.toHaveBeenCalled();
            expect(component.form.controls.userId.touched).toBe(true);
        });

        it('on a valid individual form, creates the license with the selected userId', () => {
            licenseService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-license-id' }));
            component.form.controls.userId.setValue('user-1');

            component.save();

            expect(licenseService.create).toHaveBeenCalledWith({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365, userId: 'user-1' });
            expect(router.navigate).toHaveBeenCalledWith(['/licences']);
        });
    });
});
