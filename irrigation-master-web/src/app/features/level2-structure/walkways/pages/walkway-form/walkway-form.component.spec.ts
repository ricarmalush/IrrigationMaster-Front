import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../../hydraulic-sectors/services/hydraulic-sector.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { WalkwayService } from '../../services/walkway.service';
import { WalkwayFormComponent } from './walkway-form.component';

const sectors: HydraulicSector[] = [{ id: 'sector-1', name: 'Sector Norte', areaSize: 10, organizationId: 'org-1', isDeleted: false }];

const walkway: Walkway = { id: 'walkway-1', code: 'A-01', length: 120, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

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

describe('WalkwayFormComponent', () => {
    let component: WalkwayFormComponent;
    let fixture: ComponentFixture<WalkwayFormComponent>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;
    let sectorsSubject: Subject<ListResult<HydraulicSector>>;

    // Rol por defecto NO-SUPERADMIN: mantiene el comportamiento previo de "carga sectores de
    // inmediato al iniciar" para los tests preexistentes -- las pruebas específicas de SUPERADMIN
    // (selector de organización, recarga filtrada) se agrupan aparte con su propio setup.
    function setup(routeId: string | null, role: string | null = 'PRESIDENTE'): void {
        walkwayService = jasmine.createSpyObj('WalkwayService', ['getById', 'create', 'update']);
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['list']);
        sectorsSubject = new Subject<ListResult<HydraulicSector>>();
        sectorService.list.and.returnValue(sectorsSubject.asObservable());
        organizationService = jasmine.createSpyObj('OrganizationService', ['list']);
        organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [WalkwayFormComponent],
            providers: [
                { provide: WalkwayService, useValue: walkwayService },
                { provide: HydraulicSectorService, useValue: sectorService },
                { provide: OrganizationService, useValue: organizationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(WalkwayFormComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    it('shows the sector selector as loading, with no options, until the sectors catalog resolves', () => {
        setup(null);
        component.ngOnInit();

        expect(component.sectorsLoading()).toBe(true);
        expect(component.sectors()).toEqual([]);

        sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });

        expect(component.sectorsLoading()).toBe(false);
        expect(component.sectors()).toEqual(sectors);
    });

    describe('create mode, como no-SUPERADMIN', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
        });

        it('no carga el catálogo de organizaciones ni exige organizationId', () => {
            expect(organizationService.list).not.toHaveBeenCalled();
        });

        it('does not submit an invalid form (missing sector)', () => {
            component.form.patchValue({ code: 'A-02', length: 10 });

            component.save();

            expect(walkwayService.create).not.toHaveBeenCalled();
            expect(component.form.controls.hydraulicSectorId.touched).toBe(true);
        });

        it('on a valid form, creates the walkway (organizationId undefined, resuelto por el backend) and navigates back to the list', () => {
            walkwayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.patchValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(walkwayService.create).toHaveBeenCalledWith({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1', organizationId: undefined });
            expect(router.navigate).toHaveBeenCalledWith(['/walkways']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            walkwayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El sector hidráulico indicado no existe.' }));
            component.form.patchValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(component.errorMessage()).toBe('El sector hidráulico indicado no existe.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('create mode, como SUPERADMIN', () => {
        beforeEach(() => {
            setup(null, 'SUPERADMIN');
        });

        it('carga el catálogo de organizaciones en vez de los sectores (aún sin organización elegida)', () => {
            component.ngOnInit();

            expect(organizationService.list).toHaveBeenCalled();
            expect(component.organizations()).toEqual([organization]);
            expect(sectorService.list).not.toHaveBeenCalled();
            expect(component.sectors()).toEqual([]);
        });

        it('does not submit without organizationId', () => {
            component.ngOnInit();
            component.form.patchValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(walkwayService.create).not.toHaveBeenCalled();
            expect(component.form.controls.organizationId.touched).toBe(true);
        });

        describe('onOrganizationChange()', () => {
            beforeEach(() => component.ngOnInit());

            it('clears the previously selected sector and reloads the sectors catalog filtered by that organization', () => {
                component.form.controls.hydraulicSectorId.setValue('sector-1');

                component.onOrganizationChange('org-1');

                expect(component.form.controls.hydraulicSectorId.value).toBe('');
                expect(sectorService.list).toHaveBeenCalledWith(1, 100, 'org-1');
            });

            it('populates the sectors catalog with the ones returned for that organization', () => {
                component.onOrganizationChange('org-1');
                sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });

                expect(component.sectors()).toEqual(sectors);
            });
        });

        it('on a valid form with an organization and sector chosen, creates the walkway with organizationId', () => {
            component.ngOnInit();
            walkwayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.onOrganizationChange('org-1');
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
            component.form.patchValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1', organizationId: 'org-1' });

            component.save();

            expect(walkwayService.create).toHaveBeenCalledWith({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1', organizationId: 'org-1' });
        });
    });

    describe('edit mode', () => {
        it('loads the walkway, patches the form and disables the sector selector', () => {
            setup('walkway-1');
            walkwayService.getById.and.returnValue(of<DetailResult<Walkway>>({ isSuccess: true, message: 'ok', data: walkway }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue().code).toBe('A-01');
            expect(component.form.controls.hydraulicSectorId.disabled).toBe(true);
        });

        it('does not require organizationId to save, even as SUPERADMIN (no se puede cambiar tras la creación)', () => {
            setup('walkway-1', 'SUPERADMIN');
            walkwayService.getById.and.returnValue(of<DetailResult<Walkway>>({ isSuccess: true, message: 'ok', data: walkway }));
            walkwayService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(walkwayService.update).toHaveBeenCalled();
            expect(organizationService.list).not.toHaveBeenCalled();
        });

        it('on save, calls update() without the sector id (not editable)', () => {
            setup('walkway-1');
            walkwayService.getById.and.returnValue(of<DetailResult<Walkway>>({ isSuccess: true, message: 'ok', data: walkway }));
            walkwayService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(walkwayService.update).toHaveBeenCalledWith('walkway-1', { code: 'A-01', length: 120 });
        });
    });
});
