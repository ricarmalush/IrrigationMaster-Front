import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CountryService } from '../../../../level1-core/countries/services/country.service';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { Country } from '../../../../../shared/models/country.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationDetailComponent } from './organization-detail.component';

const address = { mainAddress: 'Calle 1', city: 'Sevilla', stateOrProvince: 'SE', postalCode: '41001', countryId: 'c1', locationDetail: '' };

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B123',
    address,
    isActive: true,
    created: '2026-01-01',
    createdBy: 'system',
    invitationCode: 'ABC123'
};

const countries: Country[] = [{ id: 'c1', name: 'España', code: 'ES', phoneCode: '+34' }];

describe('OrganizationDetailComponent', () => {
    let component: OrganizationDetailComponent;
    let fixture: ComponentFixture<OrganizationDetailComponent>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let countryService: jasmine.SpyObj<CountryService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null, role: string | null = 'SUPERADMIN'): void {
        organizationService = jasmine.createSpyObj('OrganizationService', ['getById', 'create', 'update']);
        countryService = jasmine.createSpyObj('CountryService', ['list']);
        countryService.list.and.returnValue(of<ListResult<Country>>({ isSuccess: true, message: 'ok', items: countries, totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [OrganizationDetailComponent],
            providers: [
                { provide: OrganizationService, useValue: organizationService },
                { provide: CountryService, useValue: countryService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(OrganizationDetailComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    it('loads the country catalog on init, for the selector', () => {
        setup(null);
        component.ngOnInit();

        expect(countryService.list).toHaveBeenCalled();
        expect(component.countries()).toEqual(countries);
    });

    describe('create mode (no :id in the route), as SUPERADMIN', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
        });

        it('starts in create mode and does not fetch an existing organization', () => {
            expect(component.isEditMode()).toBe(false);
            expect(organizationService.getById).not.toHaveBeenCalled();
        });

        it('does not submit an invalid form', () => {
            component.save();

            expect(organizationService.create).not.toHaveBeenCalled();
            expect(component.form.get('name')?.touched).toBe(true);
        });

        it('on a valid form, creates the organization and navigates back to the list', () => {
            organizationService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-id' }));
            component.form.setValue({ name: 'Nueva', taxId: 'B999', address });

            component.save();

            expect(organizationService.create).toHaveBeenCalledWith({ name: 'Nueva', taxId: 'B999', address });
            expect(router.navigate).toHaveBeenCalledWith(['/organizations']);
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            organizationService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El campo TaxId ya está registrado.' }));
            component.form.setValue({ name: 'Nueva', taxId: 'B999', address });

            component.save();

            expect(component.errorMessage()).toBe('El campo TaxId ya está registrado.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode (:id present in the route), as SUPERADMIN', () => {
        it('loads the organization, patches the form and exposes its invitation code', () => {
            setup('org-1');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: true, message: 'ok', data: organization }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(organizationService.getById).toHaveBeenCalledWith('org-1');
            expect(component.form.getRawValue().name).toBe('Comunidad de Regantes');
            expect(component.invitationCode()).toBe('ABC123');
        });

        it('on a 404, shows the backend message instead of a blank form', () => {
            setup('missing');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: false, message: 'No se encontró la organización.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se encontró la organización.');
        });

        it('on save, calls update() with the route id', () => {
            setup('org-1');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: true, message: 'ok', data: organization }));
            organizationService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(organizationService.update).toHaveBeenCalledWith('org-1', { id: 'org-1', name: 'Comunidad de Regantes', taxId: 'B123', address });
        });

        it('leaves the form enabled for a SUPERADMIN', () => {
            setup('org-1');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: true, message: 'ok', data: organization }));

            component.ngOnInit();

            expect(component.canEdit).toBe(true);
            expect(component.form.enabled).toBe(true);
        });
    });

    // PRESIDENTE/VICEPRESIDENTE llegan aquí a ver el codigo de invitacion de su propia
    // organizacion (GetById esta autorizado para cualquier autenticado), pero Update/Delete/
    // Restore son SUPERADMIN-only en el backend -- el formulario debe quedar en solo lectura.
    describe('viewing (not editing) an organization as a non-SUPERADMIN role', () => {
        beforeEach(() => {
            setup('org-1', 'PRESIDENTE');
            organizationService.getById.and.returnValue(of<DetailResult<Organization>>({ isSuccess: true, message: 'ok', data: organization }));
            component.ngOnInit();
        });

        it('exposes canEdit as false and disables the whole form', () => {
            expect(component.canEdit).toBe(false);
            expect(component.form.disabled).toBe(true);
        });

        it('still shows the invitation code', () => {
            expect(component.invitationCode()).toBe('ABC123');
        });

        it('does not call update() even if save() is invoked directly', () => {
            component.save();

            expect(organizationService.update).not.toHaveBeenCalled();
        });
    });
});
