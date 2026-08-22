import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { AssignedLicense } from '../../../../../shared/models/assigned-license.model';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { AssignedLicenseService } from '../../../../level2-structure/assigned-licenses/services/assigned-license.service';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { InvoiceService } from '../../services/invoice.service';
import { InvoiceCreateComponent } from './invoice-create.component';

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

const assignedLicense: AssignedLicense = {
    id: 'license-1',
    organizationId: 'org-1',
    licenceTypeId: 'licence-type-1',
    userId: null,
    startDate: '2026-01-01T00:00:00Z',
    endDate: '2026-12-31T00:00:00Z',
    isActive: true,
    isExpired: false,
    created: '2026-01-01T00:00:00Z'
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

describe('InvoiceCreateComponent', () => {
    let component: InvoiceCreateComponent;
    let fixture: ComponentFixture<InvoiceCreateComponent>;
    let invoiceService: jasmine.SpyObj<InvoiceService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let userService: jasmine.SpyObj<UserService>;
    let assignedLicenseService: jasmine.SpyObj<AssignedLicenseService>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(): void {
        invoiceService = jasmine.createSpyObj('InvoiceService', ['create']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        userService = jasmine.createSpyObj('UserService', ['list']);
        userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [user], totalCount: 1 }));
        assignedLicenseService = jasmine.createSpyObj('AssignedLicenseService', ['list']);
        assignedLicenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [assignedLicense], totalCount: 1 }));
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 }));
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [InvoiceCreateComponent],
            providers: [
                { provide: InvoiceService, useValue: invoiceService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: UserService, useValue: userService },
                { provide: AssignedLicenseService, useValue: assignedLicenseService },
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(InvoiceCreateComponent);
        component = fixture.componentInstance;
    }

    function fillRequiredFields(): void {
        component.form.patchValue({
            organizationId: 'org-1',
            invoiceNumber: 'INV-0001',
            issueDate: new Date(2026, 0, 1),
            dueDate: new Date(2026, 0, 31),
            totalAmountValue: 149.99,
            totalAmountCurrency: 'EUR'
        });
    }

    it('should be created', () => {
        setup();
        expect(component).toBeTruthy();
    });

    it('loads organizations and licence type names on init', () => {
        setup();

        component.ngOnInit();

        expect(component.organizations()).toEqual([organization]);
    });

    it('defaults scope to "organization" and does not load users on init', () => {
        setup();

        component.ngOnInit();

        expect(component.form.controls.scope.value).toBe('organization');
        expect(userService.list).not.toHaveBeenCalled();
    });

    it('does not submit an invalid (empty) form', () => {
        setup();
        component.ngOnInit();

        component.save();

        expect(invoiceService.create).not.toHaveBeenCalled();
        expect(component.form.controls.organizationId.touched).toBe(true);
    });

    it('on a valid organization-scoped form, creates the invoice with userId:null and navigates back to the list', () => {
        setup();
        component.ngOnInit();
        invoiceService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-invoice-id' }));
        fillRequiredFields();

        component.save();

        expect(invoiceService.create).toHaveBeenCalledWith({
            organizationId: 'org-1',
            invoiceNumber: 'INV-0001',
            issueDate: '2026-01-01T00:00:00',
            dueDate: '2026-01-31T00:00:00',
            totalAmountValue: 149.99,
            totalAmountCurrency: 'EUR',
            userId: null,
            assignedLicenseId: null
        });
        expect(router.navigate).toHaveBeenCalledWith(['/invoices']);
    });

    it('on a 400 with a real backend validation message, shows it and does not navigate', () => {
        setup();
        component.ngOnInit();
        invoiceService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La organización ya tiene una factura en borrador.' }));
        fillRequiredFields();

        component.save();

        expect(component.errorMessage()).toBe('La organización ya tiene una factura en borrador.');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('cancel() navigates back to the list', () => {
        setup();

        component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/invoices']);
    });

    describe('onOrganizationChange()', () => {
        beforeEach(() => {
            setup();
            component.ngOnInit();
        });

        it('clears the previously selected user and license, and does not load users when scope is "organization"', () => {
            component.form.controls.userId.setValue('user-1');
            component.form.controls.assignedLicenseId.setValue('license-1');

            component.onOrganizationChange('org-1');

            expect(component.form.controls.userId.value).toBe('');
            expect(component.form.controls.assignedLicenseId.value).toBe('');
            expect(userService.list).not.toHaveBeenCalled();
        });

        it('always reloads the license catalog filtered by the chosen organization', () => {
            component.onOrganizationChange('org-1');

            expect(assignedLicenseService.list).toHaveBeenCalled();
            expect(component.licenses()).toEqual([assignedLicense]);
        });

        it('does not include licenses from other organizations', () => {
            assignedLicenseService.list.and.returnValue(
                of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [assignedLicense, { ...assignedLicense, id: 'license-2', organizationId: 'org-2' }], totalCount: 2 })
            );

            component.onOrganizationChange('org-1');

            expect(component.licenses()).toEqual([assignedLicense]);
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

        it('switching to "organization" clears the selected user', () => {
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
        });
    });

    describe('licenseOptions()', () => {
        it('resolves the licence type name and includes the end date in the label', () => {
            setup();
            component.ngOnInit();

            component.onOrganizationChange('org-1');

            expect(component.licenseOptions()).toEqual([{ id: 'license-1', label: 'Plan Operativo Profesional (vence 2026-12-31)' }]);
        });
    });

    describe('flujo individual completo', () => {
        beforeEach(() => {
            setup();
            component.ngOnInit();
            component.form.controls.scope.setValue('individual');
            fillRequiredFields();
        });

        it('does not submit when scope is "individual" and no user is selected, even if the rest of the form is valid', () => {
            component.save();

            expect(invoiceService.create).not.toHaveBeenCalled();
            expect(component.form.controls.userId.touched).toBe(true);
        });

        it('on a valid individual form, creates the invoice with the selected userId', () => {
            invoiceService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-invoice-id' }));
            component.form.controls.userId.setValue('user-1');

            component.save();

            expect(invoiceService.create).toHaveBeenCalledWith(
                jasmine.objectContaining({ organizationId: 'org-1', userId: 'user-1', assignedLicenseId: null })
            );
            expect(router.navigate).toHaveBeenCalledWith(['/invoices']);
        });
    });

    it('when a license is chosen, includes its id in the create payload', () => {
        setup();
        component.ngOnInit();
        invoiceService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-invoice-id' }));
        fillRequiredFields();
        component.form.controls.assignedLicenseId.setValue('license-1');

        component.save();

        expect(invoiceService.create).toHaveBeenCalledWith(jasmine.objectContaining({ assignedLicenseId: 'license-1' }));
    });
});
