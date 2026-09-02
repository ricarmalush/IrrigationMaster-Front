import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { IrrigationProgram } from '../../../../../shared/models/irrigation-program.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { IrrigationProgramService } from '../../services/irrigation-program.service';
import { ProgramFormComponent } from './program-form.component';

const sectors: HydraulicSector[] = [{ id: 'sector-1', name: 'Sector Norte', areaSize: 10, organizationId: 'org-1', isDeleted: false }];

const program: IrrigationProgram = {
    id: 'program-1',
    name: 'Riego matutino',
    startTime: '06:30:00',
    durationMinutes: 90,
    daysOfWeek: '1,3,5',
    isActive: false,
    organizationId: 'org-1',
    hydraulicSectorId: 'sector-1',
    created: '2026-01-01',
    seasonStartMonth: 4,
    seasonStartDay: 1,
    seasonEndMonth: 9,
    seasonEndDay: 30
};

describe('ProgramFormComponent', () => {
    let component: ProgramFormComponent;
    let fixture: ComponentFixture<ProgramFormComponent>;
    let programService: jasmine.SpyObj<IrrigationProgramService>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;
    let sectorsSubject: Subject<ListResult<HydraulicSector>>;

    function setup(routeId: string | null, role: string | null = 'SUPERADMIN'): void {
        programService = jasmine.createSpyObj('IrrigationProgramService', ['getById', 'create', 'update']);
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['list']);
        sectorsSubject = new Subject<ListResult<HydraulicSector>>();
        sectorService.list.and.returnValue(sectorsSubject.asObservable());
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [ProgramFormComponent],
            providers: [
                { provide: IrrigationProgramService, useValue: programService },
                { provide: HydraulicSectorService, useValue: sectorService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(ProgramFormComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    it('disables the whole form for a role without permission', () => {
        setup(null, 'VECINO');
        component.ngOnInit();

        expect(component.canEdit).toBe(false);
        expect(component.form.disabled).toBe(true);
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

    // Regresión del bug real (Gema, Coordinadora de Riego de AVES): "Selecciona un sector" mostraba
    // "No results found" en silencio cuando el permiso fallaba, sin ningún mensaje de error visible.
    it('surfaces the error message when the sectors catalog fails to load, instead of a silent empty dropdown', () => {
        setup(null);
        component.ngOnInit();

        sectorsSubject.next({ isSuccess: false, message: 'No tienes permiso para ver sectores.', items: [], totalCount: 0 });

        expect(component.sectors()).toEqual([]);
        expect(component.errorMessage()).toBe('No tienes permiso para ver sectores.');
    });

    describe('días de riego', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
        });

        it('toggles a day on and off', () => {
            expect(component.selectedDays().has(1)).toBe(false);

            component.toggleDay(1);
            expect(component.selectedDays().has(1)).toBe(true);

            component.toggleDay(1);
            expect(component.selectedDays().has(1)).toBe(false);
        });

        it('does not submit when no day is selected, even if the rest of the form is valid', () => {
            component.form.patchValue({ name: 'Riego', durationMinutes: 30, hydraulicSectorId: 'sector-1' });

            component.save();

            expect(programService.create).not.toHaveBeenCalled();
            expect(component.daysTouched()).toBe(true);
        });
    });

    describe('temporada (todo o nada)', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
            component.form.patchValue({ name: 'Riego', durationMinutes: 30, hydraulicSectorId: 'sector-1' });
            component.toggleDay(1);
        });

        it('accepts the 4 season fields empty', () => {
            expect(component.form.controls.season.valid).toBe(true);
        });

        it('accepts the 4 season fields filled', () => {
            component.form.controls.season.setValue({ startMonth: 4, startDay: 1, endMonth: 9, endDay: 30 });
            expect(component.form.controls.season.valid).toBe(true);
        });

        it('rejects a partial season (some filled, some empty)', () => {
            component.form.controls.season.patchValue({ startMonth: 4 });
            expect(component.form.controls.season.errors?.['seasonIncomplete']).toBe(true);
        });

        it('does not submit with a partial season', () => {
            component.form.controls.season.patchValue({ startMonth: 4 });

            component.save();

            expect(programService.create).not.toHaveBeenCalled();
        });
    });

    // Bug real: "Editar programa de riego" permitía Mes fin=11 (noviembre) + Día fin=31 (noviembre
    // solo tiene 30 días); el backend lo rechazaba correctamente pero Angular no lo impedía en el
    // propio formulario. maxStartDay()/maxEndDay() acotan el máximo real del mes elegido, y el
    // effect() del componente recorta el día ya introducido si deja de caber al cambiar de mes.
    describe('límite de Día según el mes elegido (fechas de temporada imposibles)', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
        });

        it('sin mes elegido todavía, el máximo por defecto sigue siendo 31 (no bloquea antes de elegir)', () => {
            expect(component.maxStartDay()).toBe(31);
            expect(component.maxEndDay()).toBe(31);
        });

        it('mes fin = 11 (noviembre, 30 días): maxEndDay pasa a 30', () => {
            component.form.controls.season.controls.endMonth.setValue(11);

            expect(component.maxEndDay()).toBe(30);
        });

        it('mes fin = 2 (febrero): maxEndDay pasa a 29 (año bisiesto fijo, igual que el backend)', () => {
            component.form.controls.season.controls.endMonth.setValue(2);

            expect(component.maxEndDay()).toBe(29);
        });

        it('mes inicio = 4 (abril, 30 días): maxStartDay pasa a 30', () => {
            component.form.controls.season.controls.startMonth.setValue(4);

            expect(component.maxStartDay()).toBe(30);
        });

        it('recorta automáticamente Día fin ya introducido si deja de caber en el nuevo mes', () => {
            component.form.controls.season.controls.endDay.setValue(31);

            component.form.controls.season.controls.endMonth.setValue(11);

            expect(component.form.controls.season.controls.endDay.value).toBe(30);
        });

        it('recorta automáticamente Día inicio ya introducido si deja de caber en el nuevo mes', () => {
            component.form.controls.season.controls.startDay.setValue(31);

            component.form.controls.season.controls.startMonth.setValue(4);

            expect(component.form.controls.season.controls.startDay.value).toBe(30);
        });

        it('no recorta un día que sigue cabiendo en el nuevo mes', () => {
            component.form.controls.season.controls.endDay.setValue(15);

            component.form.controls.season.controls.endMonth.setValue(11);

            expect(component.form.controls.season.controls.endDay.value).toBe(15);
        });
    });

    describe('create mode', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
            sectorsSubject.next({ isSuccess: true, message: 'ok', items: sectors, totalCount: 1 });
        });

        it('does not submit an invalid form (missing sector)', () => {
            component.form.patchValue({ name: 'Riego', durationMinutes: 30 });
            component.toggleDay(1);

            component.save();

            expect(programService.create).not.toHaveBeenCalled();
            expect(component.form.controls.hydraulicSectorId.touched).toBe(true);
        });

        it('on a valid form, builds daysOfWeek from the selected days (sorted), sends startTime as HH:mm:ss and creates the program', () => {
            programService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.patchValue({ name: 'Riego matutino', durationMinutes: 45, hydraulicSectorId: 'sector-1' });
            component.toggleDay(5);
            component.toggleDay(1);
            component.toggleDay(3);

            component.save();

            expect(programService.create).toHaveBeenCalledWith({
                name: 'Riego matutino',
                startTime: '06:00:00',
                durationMinutes: 45,
                daysOfWeek: '1,3,5',
                hydraulicSectorId: 'sector-1',
                seasonStartMonth: null,
                seasonStartDay: null,
                seasonEndMonth: null,
                seasonEndDay: null
            });
            expect(router.navigate).toHaveBeenCalledWith(['/irrigation-programs']);
        });

        it('on a 400 with a real backend validation message, shows it and does not navigate', () => {
            programService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La temporada debe especificarse completa o no especificarse.' }));
            component.form.patchValue({ name: 'Riego', durationMinutes: 30, hydraulicSectorId: 'sector-1' });
            component.toggleDay(1);

            component.save();

            expect(component.errorMessage()).toBe('La temporada debe especificarse completa o no especificarse.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode', () => {
        it('loads the program, patches the form, selects its days and disables the sector selector', () => {
            setup('program-1');
            programService.getById.and.returnValue(of<DetailResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', data: program }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue().name).toBe('Riego matutino');
            expect(component.form.controls.hydraulicSectorId.disabled).toBe(true);
            expect(component.selectedDays()).toEqual(new Set([1, 3, 5]));
            expect(component.form.getRawValue().isActive).toBe(false);
        });

        it('on save, calls update() without a hydraulicSectorId, preserving the loaded season', () => {
            setup('program-1');
            programService.getById.and.returnValue(of<DetailResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', data: program }));
            programService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(programService.update).toHaveBeenCalledWith('program-1', {
                id: 'program-1',
                name: 'Riego matutino',
                startTime: '06:30:00',
                durationMinutes: 90,
                daysOfWeek: '1,3,5',
                isActive: false,
                seasonStartMonth: 4,
                seasonStartDay: 1,
                seasonEndMonth: 9,
                seasonEndDay: 30
            });
        });

        it('on getById failure, surfaces the error message', () => {
            setup('program-1');
            programService.getById.and.returnValue(of<DetailResult<IrrigationProgram>>({ isSuccess: false, message: 'No se encontró el programa de riego.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se encontró el programa de riego.');
        });
    });
});
