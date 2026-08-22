import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { AssignedLicense } from '../../../../../shared/models/assigned-license.model';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { AssignedLicenseService } from '../../services/assigned-license.service';
import { LicenseListComponent } from './license-list.component';

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

function license(overrides: Partial<AssignedLicense>): AssignedLicense {
    return {
        id: 'license-1',
        organizationId: 'org-1',
        licenceTypeId: 'licence-type-1',
        userId: null,
        startDate: '2026-01-01T00:00:00Z',
        endDate: '2026-12-31T00:00:00Z',
        isActive: true,
        isExpired: false,
        created: '2026-01-01T00:00:00Z',
        ...overrides
    };
}

describe('LicenseListComponent', () => {
    let component: LicenseListComponent;
    let fixture: ComponentFixture<LicenseListComponent>;
    let licenseService: jasmine.SpyObj<AssignedLicenseService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let userService: jasmine.SpyObj<UserService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(role: string | null): void {
        licenseService = jasmine.createSpyObj('AssignedLicenseService', ['list', 'create', 'activate', 'deactivate', 'renew']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 }));
        userService = jasmine.createSpyObj('UserService', ['list']);
        userService.list.and.returnValue(of<ListResult<AppUser>>({ isSuccess: true, message: 'ok', items: [user], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [LicenseListComponent],
            providers: [
                provideRouter([]),
                { provide: AssignedLicenseService, useValue: licenseService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: UserService, useValue: userService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(LicenseListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes canManage as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.canManage).toBe(true);
    });

    it('exposes canManage as false for any other role', () => {
        setup('PRESIDENTE');
        expect(component.canManage).toBe(false);
    });

    describe('ngOnInit()', () => {
        it('loads organization and licence type names for resolution', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.organizationName('org-1')).toBe('Comunidad de Regantes');
            expect(component.licenceTypeName('licence-type-1')).toBe('Plan Operativo Profesional');
        });

        it('falls back to the raw id when unresolved', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.organizationName('missing-org')).toBe('missing-org');
            expect(component.licenceTypeName('missing-type')).toBe('missing-type');
        });

        it('loads user names for resolution too (individual licenses can belong to any organization)', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.scopeLabel(license({ userId: 'user-1' }))).toBe('Individual: Ricardo Ruiz');
        });
    });

    describe('scopeLabel()', () => {
        beforeEach(() => {
            setup('SUPERADMIN');
            component.ngOnInit();
        });

        it('shows "Organización" when userId is null', () => {
            expect(component.scopeLabel(license({ userId: null }))).toBe('Organización');
        });

        it('shows "Individual: {nombre resuelto}" when userId is set', () => {
            expect(component.scopeLabel(license({ userId: 'user-1' }))).toBe('Individual: Ricardo Ruiz');
        });

        it('falls back to the raw user id when unresolved', () => {
            expect(component.scopeLabel(license({ userId: 'missing-user' }))).toBe('Individual: missing-user');
        });
    });

    describe('status() / statusLabel() / statusSeverity() (el desync IsActive/IsExpired)', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('is "Activa" (success) when active and not expired', () => {
            const l = license({ isActive: true, isExpired: false });
            expect(component.statusLabel(l)).toBe('Activa');
            expect(component.statusSeverity(l)).toBe('success');
        });

        it('is "Caducada (aún activa)" (danger) when active but expired -- the dangerous desync', () => {
            const l = license({ isActive: true, isExpired: true });
            expect(component.statusLabel(l)).toBe('Caducada (aún activa)');
            expect(component.statusSeverity(l)).toBe('danger');
        });

        it('is "Desactivada" (secondary) when inactive but not expired', () => {
            const l = license({ isActive: false, isExpired: false });
            expect(component.statusLabel(l)).toBe('Desactivada');
            expect(component.statusSeverity(l)).toBe('secondary');
        });

        it('is "Caducada y desactivada" (secondary) when inactive and expired', () => {
            const l = license({ isActive: false, isExpired: true });
            expect(component.statusLabel(l)).toBe('Caducada y desactivada');
            expect(component.statusSeverity(l)).toBe('secondary');
        });
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('loads a page and exposes the items/total on success', () => {
            licenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [license({})], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(licenseService.list).toHaveBeenCalledWith(1, 10);
            expect(component.licenses().length).toBe(1);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            licenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.licenses()).toEqual([]);
        });
    });

    it('activate()/deactivate() do nothing when canManage is false', () => {
        setup('PRESIDENTE');

        component.activate(license({}));
        component.deactivate(license({}));

        expect(licenseService.activate).not.toHaveBeenCalled();
        expect(licenseService.deactivate).not.toHaveBeenCalled();
    });

    describe('activate() / deactivate()', () => {
        beforeEach(() => {
            setup('SUPERADMIN');
            licenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        });

        it('activate() calls the service, shows a success toast and reloads', () => {
            licenseService.activate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.activate(license({ isActive: false }));

            expect(licenseService.activate).toHaveBeenCalledWith('license-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(licenseService.list).toHaveBeenCalled();
        });

        it('deactivate() calls the service, shows a success toast and reloads', () => {
            licenseService.deactivate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.deactivate(license({ isActive: true }));

            expect(licenseService.deactivate).toHaveBeenCalledWith('license-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(licenseService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when the action fails', () => {
            licenseService.activate.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.' }));

            component.activate(license({ isActive: false }));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo establecer comunicación con el servidor.' }));
            expect(licenseService.list).not.toHaveBeenCalled();
        });
    });

    it('openRenewDialog() does not open the dialog when canManage is false', () => {
        setup('PRESIDENTE');

        component.openRenewDialog(license({}));

        expect(component.renewDialogVisible()).toBe(false);
    });

    describe('openRenewDialog() / confirmRenew()', () => {
        beforeEach(() => {
            setup('SUPERADMIN');
            licenseService.list.and.returnValue(of<ListResult<AssignedLicense>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        });

        it('opens the dialog with a default of 30 extra days', () => {
            component.openRenewDialog(license({}));

            expect(component.renewDialogVisible()).toBe(true);
            expect(component.renewExtraDays()).toBe(30);
        });

        it('confirmRenew() sends the chosen extraDays, closes the dialog and reloads on success', () => {
            licenseService.renew.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));
            component.openRenewDialog(license({ id: 'license-9' }));
            component.renewExtraDays.set(45);

            component.confirmRenew();

            expect(licenseService.renew).toHaveBeenCalledWith({ id: 'license-9', extraDays: 45 });
            expect(component.renewDialogVisible()).toBe(false);
            expect(licenseService.list).toHaveBeenCalled();
        });

        it('confirmRenew() on failure keeps the dialog open and shows an error toast', () => {
            licenseService.renew.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'El valor de extraDays debe ser positivo.' }));
            component.openRenewDialog(license({}));

            component.confirmRenew();

            expect(component.renewDialogVisible()).toBe(true);
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'El valor de extraDays debe ser positivo.' }));
        });
    });
});
