import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { MyWalkwayIrrigationStatus, NeighborIrrigationStatus, WalkwayRequestedTurn } from '../../../../../shared/models/irrigation-turn.model';
import { DetailResult, OperationResult } from '../../../../../shared/models/result.model';
import { Walkway } from '../../../../../shared/models/walkway.model';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';
import { MyIrrigationComponent } from './my-irrigation.component';

const walkwayA: Walkway = { id: 'walkway-1', code: 'A-01', length: 100, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

function requestedTurn(overrides: Partial<WalkwayRequestedTurn> = {}): WalkwayRequestedTurn {
    return {
        turnId: 'turn-1',
        userId: 'user-1',
        fullName: 'Ana García',
        status: 'Requested',
        scheduledStart: '2026-08-26T08:00:00Z',
        scheduledEnd: '2026-08-26T10:00:00Z',
        houseNumber: 12,
        ...overrides
    };
}

function liveTurn(overrides: Partial<NeighborIrrigationStatus> = {}): NeighborIrrigationStatus {
    return {
        userId: 'user-2',
        turnId: 'turn-2',
        fullName: 'Luis Pérez',
        status: 'Watering',
        scheduledStart: '2026-08-25T08:00:00Z',
        scheduledEnd: '2026-08-25T10:00:00Z',
        isApproved: true,
        ...overrides
    };
}

function status(overrides: Partial<MyWalkwayIrrigationStatus> = {}): MyWalkwayIrrigationStatus {
    return {
        walkwayId: 'walkway-1',
        walkwayCode: 'A-01',
        requestsTomorrow: [],
        liveToday: [],
        ...overrides
    };
}

describe('MyIrrigationComponent', () => {
    let component: MyIrrigationComponent;
    let fixture: ComponentFixture<MyIrrigationComponent>;
    let turnService: jasmine.SpyObj<IrrigationTurnService>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(myUserId: string | null = 'user-me'): void {
        turnService = jasmine.createSpyObj('IrrigationTurnService', ['getMyWalkwayStatus', 'request']);

        walkwayService = jasmine.createSpyObj('WalkwayService', ['getById']);
        walkwayService.getById.and.returnValue(of<DetailResult<Walkway>>({ isSuccess: true, message: 'ok', data: walkwayA }));

        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getUserId']);
        currentSession.getUserId.and.returnValue(myUserId);

        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [MyIrrigationComponent],
            providers: [
                { provide: IrrigationTurnService, useValue: turnService },
                { provide: WalkwayService, useValue: walkwayService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(MyIrrigationComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup();
        turnService.getMyWalkwayStatus.and.returnValue(of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status() }));
        expect(component).toBeTruthy();
    });

    describe('ngOnInit()', () => {
        it('exposes hasWalkway/walkwayCode and both lists on success', () => {
            setup();
            const requests = [requestedTurn()];
            const live = [liveTurn()];
            turnService.getMyWalkwayStatus.and.returnValue(of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ requestsTomorrow: requests, liveToday: live }) }));

            component.ngOnInit();

            expect(component.hasWalkway()).toBe(true);
            expect(component.walkwayCode()).toBe('A-01');
            expect(component.requestsTomorrow()).toEqual(requests);
            expect(component.liveToday()).toEqual(live);
            expect(component.errorMessage()).toBeNull();
        });

        // Estado válido de esta vista informativa (p. ej. un Presidente sin andador propio) --
        // no un error: ambas listas vacías, sin mensaje de error.
        it('exposes hasWalkway:false when walkwayId is null, without treating it as an error', () => {
            setup();
            turnService.getMyWalkwayStatus.and.returnValue(
                of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ walkwayId: null, walkwayCode: null }) })
            );

            component.ngOnInit();

            expect(component.hasWalkway()).toBe(false);
            expect(component.walkwayCode()).toBeNull();
            expect(component.errorMessage()).toBeNull();
            expect(walkwayService.getById).not.toHaveBeenCalled();
        });

        it('surfaces the backend/network error message on failure', () => {
            setup();
            turnService.getMyWalkwayStatus.and.returnValue(
                of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.' })
            );

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.hasWalkway()).toBe(false);
        });

        it('resolves hydraulicSectorId from the walkway once walkwayId is known', () => {
            setup();
            turnService.getMyWalkwayStatus.and.returnValue(of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status() }));

            component.ngOnInit();

            expect(walkwayService.getById).toHaveBeenCalledWith('walkway-1');
            expect(component.hydraulicSectorId()).toBe('sector-1');
        });
    });

    describe('statusLabel()', () => {
        beforeEach(() => setup());

        it('translates Watering/Completed/Waiting to the same vocabulary as the sibling "Estado de Riego"', () => {
            expect(component.statusLabel('Watering')).toBe('Regando');
            expect(component.statusLabel('Completed')).toBe('Terminado');
            expect(component.statusLabel('Waiting')).toBe('Pendiente');
        });
    });

    // ─── "Solicitar mi turno": vive aquí también desde que "Estado de Riego" para Vecino pasó a
    // apuntar a esta pantalla (ver app.menu.ts) -- mismo criterio que canRequestTurn() en
    // IrrigationStatusComponent, la vista hermana donde vivía originalmente esta acción ───

    describe('canRequestTurn() (espejo de canRequestTurn en la vista hermana "Estado de Riego")', () => {
        it('is true once hydraulicSectorId resolves and today has no turn of my own', () => {
            setup('user-me');
            turnService.getMyWalkwayStatus.and.returnValue(of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ liveToday: [liveTurn({ userId: 'other-user' })] }) }));

            component.ngOnInit();

            expect(component.canRequestTurn()).toBe(true);
        });

        it('is false when the user already has a turn today, regardless of status', () => {
            setup('user-me');
            turnService.getMyWalkwayStatus.and.returnValue(
                of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ liveToday: [liveTurn({ userId: 'user-me', status: 'Completed' })] }) })
            );

            component.ngOnInit();

            expect(component.canRequestTurn()).toBe(false);
        });

        it('is false before hydraulicSectorId resolves (no andador / sin turnos aún)', () => {
            setup('user-me');
            expect(component.canRequestTurn()).toBe(false);
        });

        it('is false when the caller has no walkway assigned', () => {
            setup('user-me');
            turnService.getMyWalkwayStatus.and.returnValue(
                of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ walkwayId: null, walkwayCode: null }) })
            );

            component.ngOnInit();

            expect(component.canRequestTurn()).toBe(false);
        });
    });

    describe('requestTurn()', () => {
        beforeEach(() => {
            setup('user-me');
            turnService.getMyWalkwayStatus.and.returnValue(of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status() }));
            component.ngOnInit();
        });

        it('does nothing when canRequestTurn is false', () => {
            turnService.getMyWalkwayStatus.and.returnValue(
                of<DetailResult<MyWalkwayIrrigationStatus>>({ isSuccess: true, message: 'ok', data: status({ liveToday: [liveTurn({ userId: 'user-me' })] }) })
            );
            component.ngOnInit();

            component.requestTurn();

            expect(turnService.request).not.toHaveBeenCalled();
        });

        it('on success, requests a 2h turn starting shortly, shows a success toast and reloads', () => {
            turnService.request.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-turn' }));

            component.requestTurn();

            expect(turnService.request).toHaveBeenCalledWith(jasmine.objectContaining({ hydraulicSectorId: 'sector-1', requesterId: 'user-me' }));
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Operación completada exitosamente.' }));
            expect(turnService.getMyWalkwayStatus).toHaveBeenCalledTimes(2);
        });

        it('on a backend validation failure, shows an error toast and does not reload', () => {
            turnService.request.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La fecha de inicio debe ser futura.' }));

            component.requestTurn();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'La fecha de inicio debe ser futura.' }));
            expect(turnService.getMyWalkwayStatus).toHaveBeenCalledTimes(1);
        });
    });
});
