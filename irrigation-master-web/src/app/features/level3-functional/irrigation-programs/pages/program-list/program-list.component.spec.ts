import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { IrrigationProgram } from '../../../../../shared/models/irrigation-program.model';
import { ListResult } from '../../../../../shared/models/result.model';
import { IrrigationProgramService } from '../../services/irrigation-program.service';
import { ProgramListComponent } from './program-list.component';

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 10, organizationId: 'org-1', isDeleted: false };

const program: IrrigationProgram = {
    id: 'program-1',
    name: 'Riego matutino',
    startTime: '06:00:00',
    durationMinutes: 90,
    daysOfWeek: '1,3,5',
    isActive: true,
    organizationId: 'org-1',
    hydraulicSectorId: 'sector-1',
    created: '2026-01-01'
};

describe('ProgramListComponent', () => {
    let component: ProgramListComponent;
    let fixture: ComponentFixture<ProgramListComponent>;
    let programService: jasmine.SpyObj<IrrigationProgramService>;
    let hydraulicSectorService: jasmine.SpyObj<HydraulicSectorService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;

    function setup(role: string | null): void {
        programService = jasmine.createSpyObj('IrrigationProgramService', ['list']);
        hydraulicSectorService = jasmine.createSpyObj('HydraulicSectorService', ['list']);
        hydraulicSectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: true, message: 'ok', items: [sector], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);

        TestBed.configureTestingModule({
            imports: [ProgramListComponent],
            providers: [
                provideRouter([]),
                { provide: IrrigationProgramService, useValue: programService },
                { provide: HydraulicSectorService, useValue: hydraulicSectorService },
                { provide: CurrentSessionService, useValue: currentSession }
            ]
        });

        fixture = TestBed.createComponent(ProgramListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes canEdit as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.canEdit).toBe(true);
    });

    it('exposes canEdit as true for COORDINADOR_RIEGO', () => {
        setup('COORDINADOR_RIEGO');
        expect(component.canEdit).toBe(true);
    });

    it('exposes canEdit as false for a role without permission', () => {
        setup('PRESIDENTE');
        expect(component.canEdit).toBe(false);
    });

    describe('ngOnInit()', () => {
        it('loads hydraulic sectors and resolves sector names by id', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.sectorName('sector-1')).toBe('Sector Norte');
        });

        it('falls back to the raw id when the sector is unknown', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.sectorName('missing-sector')).toBe('missing-sector');
        });
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('loads a page and exposes the items/total on success', () => {
            programService.list.and.returnValue(of<ListResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', items: [program], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(programService.list).toHaveBeenCalledWith(1, 10);
            expect(component.programs()).toEqual([program]);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('computes the correct page number from a non-zero "first"', () => {
            programService.list.and.returnValue(of<ListResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 20, rows: 10 });

            expect(programService.list).toHaveBeenCalledWith(3, 10);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            programService.list.and.returnValue(of<ListResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.programs()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            programService.list.and.returnValue(of<ListResult<IrrigationProgram>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.programs()).toEqual([]);
        });
    });

    describe('daysLabel()', () => {
        it('maps ISO day numbers to short Spanish labels', () => {
            setup('SUPERADMIN');
            expect(component.daysLabel('1,3,5')).toBe('Lu, Mi, Vi');
        });

        it('falls back to the raw token for an unrecognized value', () => {
            setup('SUPERADMIN');
            expect(component.daysLabel('1,9')).toBe('Lu, 9');
        });
    });
});
