import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { DetailResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';
import { SectorFormComponent } from './sector-form.component';

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5, organizationId: 'org-1', isDeleted: false };

describe('SectorFormComponent', () => {
    let component: SectorFormComponent;
    let fixture: ComponentFixture<SectorFormComponent>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null): void {
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['getById', 'create', 'update']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [SectorFormComponent],
            providers: [
                { provide: HydraulicSectorService, useValue: sectorService },
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

    describe('create mode', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
        });

        it('does not submit an invalid form', () => {
            component.save();

            expect(sectorService.create).not.toHaveBeenCalled();
            expect(component.form.get('name')?.touched).toBe(true);
        });

        it('on a valid form, creates the sector and navigates back to the list', () => {
            sectorService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({ name: 'Sector Sur', areaSize: 5 });

            component.save();

            expect(sectorService.create).toHaveBeenCalledWith({ name: 'Sector Sur', areaSize: 5 });
            expect(router.navigate).toHaveBeenCalledWith(['/hydraulic-sectors']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            sectorService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El campo Name es obligatorio.' }));
            component.form.setValue({ name: 'Sector Sur', areaSize: 5 });

            component.save();

            expect(component.errorMessage()).toBe('El campo Name es obligatorio.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode', () => {
        it('loads the sector and patches the form', () => {
            setup('sector-1');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: true, message: 'ok', data: sector }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue()).toEqual({ name: 'Sector Norte', areaSize: 12.5 });
        });

        it('on a 404, shows the backend message', () => {
            setup('missing');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: false, message: 'No se encontró el sector.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se encontró el sector.');
        });

        it('on save, calls update() with the route id', () => {
            setup('sector-1');
            sectorService.getById.and.returnValue(of<DetailResult<HydraulicSector>>({ isSuccess: true, message: 'ok', data: sector }));
            sectorService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(sectorService.update).toHaveBeenCalledWith('sector-1', { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5 });
        });
    });
});
