import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
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

describe('LicenseAssignComponent', () => {
    let component: LicenseAssignComponent;
    let fixture: ComponentFixture<LicenseAssignComponent>;
    let licenseService: jasmine.SpyObj<AssignedLicenseService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(): void {
        licenseService = jasmine.createSpyObj('AssignedLicenseService', ['create']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType], totalCount: 1 }));
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [LicenseAssignComponent],
            providers: [
                { provide: AssignedLicenseService, useValue: licenseService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: LicenceTypeService, useValue: licenceTypeService },
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

    it('on a valid form, creates the license and navigates back to the list', () => {
        setup();
        component.ngOnInit();
        licenseService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-license-id' }));
        component.form.setValue({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });

        component.save();

        expect(licenseService.create).toHaveBeenCalledWith({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });
        expect(router.navigate).toHaveBeenCalledWith(['/licences']);
    });

    it('on a 400 with a real backend validation message, shows it and does not navigate', () => {
        setup();
        component.ngOnInit();
        licenseService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La organización ya tiene una licencia activa.' }));
        component.form.setValue({ organizationId: 'org-1', licenceTypeId: 'licence-type-1', durationDays: 365 });

        component.save();

        expect(component.errorMessage()).toBe('La organización ya tiene una licencia activa.');
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('cancel() navigates back to the list', () => {
        setup();

        component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/licences']);
    });
});
