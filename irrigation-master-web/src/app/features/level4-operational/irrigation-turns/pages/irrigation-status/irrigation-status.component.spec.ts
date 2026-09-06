import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { IrrigationProgram, IsIrrigationDayResult } from '../../../../../shared/models/irrigation-program.model';
import { NeighborIrrigationStatus, WalkwayIrrigationStatus } from '../../../../../shared/models/irrigation-turn.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { IrrigationProgramService } from '../../../../level3-functional/irrigation-programs/services/irrigation-program.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';
import { IrrigationStatusComponent } from './irrigation-status.component';

const walkwayA: Walkway = { id: 'walkway-1', code: 'A-01', length: 100, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };
const walkwayB: Walkway = { id: 'walkway-2', code: 'B-01', length: 100, hydraulicSectorId: 'sector-2', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

const program: IrrigationProgram = {
    id: 'program-1',
    name: 'Riego Sector Uno',
    startTime: '06:00:00',
    durationMinutes: 90,
    daysOfWeek: '6,7',
    isActive: true,
    organizationId: 'org-1',
    hydraulicSectorId: 'sector-1',
    created: '2026-01-01',
    seasonStartMonth: 3,
    seasonStartDay: 1,
    seasonEndMonth: 11,
    seasonEndDay: 30
};

const me: AppUser = {
    id: 'user-me',
    firstName: 'Ricardo',
    lastName: 'Ruiz',
    email: 'ricardo@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: true,
    fullName: 'Ricardo Ruiz',
    created: '2026-01-01',
    walkwayId: 'walkway-1',
    walkwayCode: 'A-01',
    organizationName: 'Comunidad'
};

function neighbor(overrides: Partial<NeighborIrrigationStatus>): NeighborIrrigationStatus {
    return {
        userId: 'other-user',
        turnId: 'turn-x',
        fullName: 'Otro Vecino',
        status: 'Waiting',
        scheduledStart: '2026-08-25T08:00:00Z',
        scheduledEnd: '2026-08-25T10:00:00Z',
        houseNumber: null,
        ...overrides
    };
}

describe('IrrigationStatusComponent', () => {
    let component: IrrigationStatusComponent;
    let fixture: ComponentFixture<IrrigationStatusComponent>;
    let turnService: jasmine.SpyObj<IrrigationTurnService>;
    let programService: jasmine.SpyObj<IrrigationProgramService>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let userService: jasmine.SpyObj<UserService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(myUserId: string | null, statusData: WalkwayIrrigationStatus[] = []): void {
        turnService = jasmine.createSpyObj('IrrigationTurnService', ['getOrganizationStatus', 'request', 'start', 'cancel', 'complete']);
        turnService.getOrganizationStatus.and.returnValue(of<DetailResult<WalkwayIrrigationStatus[]>>({ isSuccess: true, message: 'ok', data: statusData }));

        programService = jasmine.createSpyObj('IrrigationProgramService', ['list', 'isIrrigationDay']);
        programService.list.and.returnValue(of<ListResult<IrrigationProgram>>({ isSuccess: true, message: 'ok', items: [program], totalCount: 1 }));
        programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: true, message: 'ok', data: { isIrrigationDay: true, isHoliday: false } }));

        walkwayService = jasmine.createSpyObj('WalkwayService', ['list']);
        walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: true, message: 'ok', items: [walkwayA, walkwayB], totalCount: 2 }));

        userService = jasmine.createSpyObj('UserService', ['getById']);
        userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: me }));

        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getUserId']);
        currentSession.getUserId.and.returnValue(myUserId);

        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [IrrigationStatusComponent],
            providers: [
                { provide: IrrigationTurnService, useValue: turnService },
                { provide: IrrigationProgramService, useValue: programService },
                { provide: WalkwayService, useValue: walkwayService },
                { provide: UserService, useValue: userService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(IrrigationStatusComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('user-me');
        expect(component).toBeTruthy();
    });

    describe('statusLabel()', () => {
        beforeEach(() => setup('user-me'));

        it('maps Watering/Waiting/Completed to the exact Spanish labels used by the App', () => {
            expect(component.statusLabel('Watering')).toBe('Regando');
            expect(component.statusLabel('Waiting')).toBe('Pendiente');
            expect(component.statusLabel('Completed')).toBe('Terminado');
        });
    });

    describe('canRequestTurn() (espejo de CanRequestTurn en la App)', () => {
        beforeEach(() => setup('user-me'));

        it('is false before myWalkwayId resolves', () => {
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] };
            expect(component.canRequestTurn(walkway)).toBe(false);
        });

        it('is true on the user\'s own walkway when they have no turn there today', () => {
            component.myWalkwayId.set('walkway-1');
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] };
            expect(component.canRequestTurn(walkway)).toBe(true);
        });

        it('is false on a walkway that is not the user\'s own', () => {
            component.myWalkwayId.set('walkway-1');
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-2', walkwayCode: 'B-01', neighbors: [] };
            expect(component.canRequestTurn(walkway)).toBe(false);
        });

        it('is false when the user already has a turn today on their own walkway, regardless of status', () => {
            component.myWalkwayId.set('walkway-1');
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [neighbor({ userId: 'user-me', status: 'Completed' })] };
            expect(component.canRequestTurn(walkway)).toBe(false);
        });
    });

    describe('canStart() / canCancel() / canComplete()', () => {
        beforeEach(() => setup('user-me'));

        it('canStart is true only for my own turn while Waiting -- no approval step anymore', () => {
            expect(component.canStart(neighbor({ userId: 'user-me', status: 'Waiting' }))).toBe(true);
            expect(component.canStart(neighbor({ userId: 'other-user', status: 'Waiting' }))).toBe(false);
        });

        it('canCancel is true only for my own turn while Waiting -- same condition as canStart', () => {
            expect(component.canCancel(neighbor({ userId: 'user-me', status: 'Waiting' }))).toBe(true);
            expect(component.canCancel(neighbor({ userId: 'user-me', status: 'Watering' }))).toBe(false);
            expect(component.canCancel(neighbor({ userId: 'other-user', status: 'Waiting' }))).toBe(false);
        });

        it('canComplete is true only for my own turn while Watering', () => {
            expect(component.canComplete(neighbor({ userId: 'user-me', status: 'Watering' }))).toBe(true);
            expect(component.canComplete(neighbor({ userId: 'user-me', status: 'Waiting' }))).toBe(false);
            expect(component.canComplete(neighbor({ userId: 'other-user', status: 'Watering' }))).toBe(false);
        });
    });

    describe('ngOnInit() / fetch()', () => {
        it('resolves myWalkwayId from the current user profile', () => {
            setup('user-me');
            component.ngOnInit();
            expect(component.myWalkwayId()).toBe('walkway-1');
        });

        it('builds the sector-day/season pattern text per walkway from active programs', () => {
            setup('user-me');
            component.ngOnInit();
            expect(component.pattern('walkway-1')).toBe('Este sector riega: Sábado, Domingo (de marzo a noviembre)');
            expect(component.pattern('walkway-2')).toBeNull();
        });

        it('shows "No hay riego programado hoy." when the empty walkway\'s sector is not an irrigation day', () => {
            const emptyStatus: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] }];
            setup('user-me', emptyStatus);
            programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: true, message: 'ok', data: { isIrrigationDay: false, isHoliday: false } }));

            component.ngOnInit();

            expect(programService.isIrrigationDay).toHaveBeenCalledWith('sector-1');
            expect(component.emptyStateMessage('walkway-1')).toBe('No hay riego programado hoy.');
        });

        it('shows "No hay riego programado hoy." (sin mención a festivo) when isIrrigationDay is false even on a holiday', () => {
            // isHoliday nunca debe filtrarse a este mensaje -- solo isIrrigationDay decide si hay
            // riego o no. Confirmado con el Presidente: un festivo no bloquea ni condiciona nada.
            const emptyStatus: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] }];
            setup('user-me', emptyStatus);
            programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: true, message: 'ok', data: { isIrrigationDay: false, isHoliday: true } }));

            component.ngOnInit();

            expect(component.emptyStateMessage('walkway-1')).toBe('No hay riego programado hoy.');
        });

        it('shows "Sin actividad todavía." when the empty walkway\'s sector IS an irrigation day', () => {
            const emptyStatus: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] }];
            setup('user-me', emptyStatus);
            programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: true, message: 'ok', data: { isIrrigationDay: true, isHoliday: false } }));

            component.ngOnInit();

            expect(component.emptyStateMessage('walkway-1')).toBe('Sin actividad todavía.');
        });

        it('shows "Sin actividad todavía — hoy es festivo." when it IS an irrigation day AND today is a holiday', () => {
            const emptyStatus: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] }];
            setup('user-me', emptyStatus);
            programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: true, message: 'ok', data: { isIrrigationDay: true, isHoliday: true } }));

            component.ngOnInit();

            expect(component.emptyStateMessage('walkway-1')).toBe('Sin actividad todavía — hoy es festivo.');
        });

        it('fails soft to "Sin actividad todavía." when the isIrrigationDay check fails', () => {
            const emptyStatus: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] }];
            setup('user-me', emptyStatus);
            programService.isIrrigationDay.and.returnValue(of<OperationResult<IsIrrigationDayResult>>({ isSuccess: false, message: 'error' }));

            component.ngOnInit();

            expect(component.emptyStateMessage('walkway-1')).toBe('Sin actividad todavía.');
        });

        it('does not call isIrrigationDay for a walkway that already has neighbors today', () => {
            const statusWithNeighbors: WalkwayIrrigationStatus[] = [{ walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [neighbor({ userId: 'other-user' })] }];
            setup('user-me', statusWithNeighbors);

            component.ngOnInit();

            expect(programService.isIrrigationDay).not.toHaveBeenCalled();
        });

        it('surfaces the backend/network error message when the status query fails', () => {
            setup('user-me');
            turnService.getOrganizationStatus.and.returnValue(of<DetailResult<WalkwayIrrigationStatus[]>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    describe('requestTurn()', () => {
        beforeEach(() => {
            setup('user-me');
            component.ngOnInit();
        });

        it('does nothing when canRequestTurn is false', () => {
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-2', walkwayCode: 'B-01', neighbors: [] };

            component.requestTurn(walkway);

            expect(turnService.request).not.toHaveBeenCalled();
        });

        it('on a valid own empty walkway, requests a 2h turn starting shortly and reloads on success', () => {
            turnService.request.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-turn' }));
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] };

            component.requestTurn(walkway);

            expect(turnService.request).toHaveBeenCalledWith(jasmine.objectContaining({ hydraulicSectorId: 'sector-1', requesterId: 'user-me' }));
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Operación completada exitosamente.' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(2);
        });

        it('on a backend validation failure, shows an error toast and does not reload', () => {
            turnService.request.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La fecha de inicio debe ser futura.' }));
            const walkway: WalkwayIrrigationStatus = { walkwayId: 'walkway-1', walkwayCode: 'A-01', neighbors: [] };

            component.requestTurn(walkway);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'La fecha de inicio debe ser futura.' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(1);
        });
    });

    describe('startTurn() / cancelTurn() / completeTurn()', () => {
        beforeEach(() => {
            setup('user-me');
            component.ngOnInit();
        });

        it('startTurn() does nothing when canStart is false', () => {
            component.startTurn(neighbor({ userId: 'other-user' }));
            expect(turnService.start).not.toHaveBeenCalled();
        });

        it('startTurn() calls the service and reloads on success', () => {
            turnService.start.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.startTurn(neighbor({ userId: 'user-me', turnId: 'turn-me', status: 'Waiting' }));

            expect(turnService.start).toHaveBeenCalledWith('turn-me');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(2);
        });

        it('cancelTurn() does nothing when canCancel is false', () => {
            component.cancelTurn(neighbor({ userId: 'other-user', status: 'Waiting' }));
            expect(turnService.cancel).not.toHaveBeenCalled();
        });

        it('cancelTurn() calls the service and reloads on success', () => {
            turnService.cancel.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.cancelTurn(neighbor({ userId: 'user-me', turnId: 'turn-me', status: 'Waiting' }));

            expect(turnService.cancel).toHaveBeenCalledWith('turn-me');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(2);
        });

        it('cancelTurn() shows an error toast and does not reload on failure', () => {
            turnService.cancel.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'Solo se puede cancelar un turno que todavía no ha empezado a regar.' }));

            component.cancelTurn(neighbor({ userId: 'user-me', turnId: 'turn-me', status: 'Waiting' }));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Solo se puede cancelar un turno que todavía no ha empezado a regar.' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(1);
        });

        it('completeTurn() does nothing when canComplete is false', () => {
            component.completeTurn(neighbor({ userId: 'other-user', status: 'Watering' }));
            expect(turnService.complete).not.toHaveBeenCalled();
        });

        it('completeTurn() calls the service and reloads on success', () => {
            turnService.complete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok', data: true }));

            component.completeTurn(neighbor({ userId: 'user-me', turnId: 'turn-me', status: 'Watering' }));

            expect(turnService.complete).toHaveBeenCalledWith('turn-me');
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(2);
        });

        it('completeTurn() shows an error toast and does not reload on failure', () => {
            turnService.complete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' }));

            component.completeTurn(neighbor({ userId: 'user-me', turnId: 'turn-me', status: 'Watering' }));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No tienes permiso para realizar esta acción.' }));
            expect(turnService.getOrganizationStatus).toHaveBeenCalledTimes(1);
        });
    });
});
