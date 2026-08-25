import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';
import { SectorFormComponent } from './sector-form.component';

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5, organizationId: 'org-1', isDeleted: false };

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

describe('SectorFormComponent', () => {
    let component: SectorFormComponent;
    let fixture: ComponentFixture<SectorFormComponent>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null, role: string | null = 'SUPERADMIN'): void {
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['getById', 'create', 'update']);
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [SectorFormComponent],
            providers: [
                { provide: HydraulicSectorService, useValue: sectorService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(SectorFormComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    describe('gating por rol (selector de Organización)', () => {
        it('SUPERADMIN: isSuperAdmin es true', () => {
            setup(null, 'SUPERADMIN');
            expect(component.isSuperAdmin).toBe(true);
        });

        it('cualquier otro rol: isSuperAdmin es false', () => {
            setup(null, 'PRESIDENTE');
            expect(component.isSuperAdmin).toBe(false);
        });
    });

    describe('create mode, como SUPERADMIN', () => {
        beforeEach(() => {
            setup(null, 'SUPERADMIN');
            component.ngOnInit();
        });

        it('carga el catálogo de organizaciones', () => {
            expect(organizationService.list).toHaveBeenCalled();
            expect(component.organizations()).toEqual([organization]);
        });

        it('does not submit an invalid form', () => {
            component.save();

            expect(sectorService.create).not.toHaveBeenCalled();
            expect(component.form.controls.name.touched).toBe(true);
        });

        it('requires organizationId to submit', () => {
            component.form.patchValue({ name: 'Sector Sur', areaSize: 5 });

            component.save();

            expect(sectorService.create).not.toHaveBeenCalled();
            expect(component.form.controls.organizationId.touched).toBe(true);
        });

        it('on a valid form, creates the sector with the selected organizationId and navigates back to the list', () => {
            sectorService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({ name: 'Sector Sur', areaSize: 5, organizationId: 'org-1' });

            component.save();

            expect(sectorService.create).toHaveBeenCalledWith({ name: 'Sector Sur', areaSize: 5, organizationId: 'org-1' });
            expect(router.navigate).toHaveBeenCalledWith(['/hydraulic-sectors']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            sectorService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El campo Name es obligatorio.' }));
            component.form.setValue({ name: 'Sector Sur', areaSize: 5, organizationId: 'org-1' });

            component.save();

            expect(component.errorMessage()).toBe('El campo Name es obligatorio.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('create mode, como no-SUPERADMIN', () => {
        beforeEach(() => {
            setup(null, 'PRESIDENTE');
            component.ngOnInit();
        });

        it('no carga el catálogo de organizaciones ni exige organizationId', () => {
            expect(organizationService.list).not.toHaveBeenCalled();

            component.form.patchValue({ name: 'Sector Sur', areaSize: 5 });
            sectorService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));

            component.save();

            expect(sectorService.create).toHaveBeenCalledWith({ name: 'Sector Sur', areaSize: 5, organizationId: undefined });
        });
    });

    describe('edit mode', () => {
        it('loads the sector and patches the form', () => {
            setup('sector-1');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: true, message: 'ok', data: sector }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue().name).toBe('Sector Norte');
            expect(component.form.getRawValue().areaSize).toBe(12.5);
        });

        it('no exige organizationId para guardar (no se puede cambiar tras la creación)', () => {
            setup('sector-1');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: true, message: 'ok', data: sector }));
            sectorService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(sectorService.update).toHaveBeenCalled();
        });

        it('on a 404, shows the backend message', () => {
            setup('missing');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: false, message: 'No se encontró el sector.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se encontró el sector.');
        });

        it('on save, calls update() with the route id and without organizationId', () => {
            setup('sector-1');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: true, message: 'ok', data: sector }));
            sectorService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(sectorService.update).toHaveBeenCalledWith('sector-1', { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5 });
        });
    });
});
