import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../../hydraulic-sectors/services/hydraulic-sector.service';
import { WalkwayService } from '../../services/walkway.service';
import { WalkwayFormComponent } from './walkway-form.component';

const sectors: HydraulicSector[] = [{ id: 'sector-1', name: 'Sector Norte', areaSize: 10, organizationId: 'org-1', isDeleted: false }];

const walkway: Walkway = { id: 'walkway-1', code: 'A-01', length: 120, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

describe('WalkwayFormComponent', () => {
    let component: WalkwayFormComponent;
    let fixture: ComponentFixture<WalkwayFormComponent>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;
    let sectorsSubject: Subject<ListResult<HydraulicSector>>;

    function setup(routeId: string | null): void {
        walkwayService = jasmine.createSpyObj('WalkwayService', ['getById', 'create', 'update']);
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['list']);
        sectorsSubject = new Subject<ListResult<HydraulicSector>>();
        sectorService.list.and.returnValue(sectorsSubject.asObservable());
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [WalkwayFormComponent],
            providers: [
                { provide: WalkwayService, useValue: walkwayService },
                { provide: HydraulicSectorService, useValue: sectorService },
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

    describe('create mode', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
        });

        it('does not submit an invalid form (missing sector)', () => {
            component.form.patchValue({ code: 'A-02', length: 10 });

            component.save();

            expect(walkwayService.create).not.toHaveBeenCalled();
            expect(component.form.get('hydraulicSectorId')?.touched).toBe(true);
        });

        it('on a valid form, creates the walkway and navigates back to the list', () => {
            walkwayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(walkwayService.create).toHaveBeenCalledWith({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });
            expect(router.navigate).toHaveBeenCalledWith(['/walkways']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            walkwayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El sector hidráulico indicado no existe.' }));
            component.form.setValue({ code: 'A-02', length: 10, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(component.errorMessage()).toBe('El sector hidráulico indicado no existe.');
            expect(router.navigate).not.toHaveBeenCalled();
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
