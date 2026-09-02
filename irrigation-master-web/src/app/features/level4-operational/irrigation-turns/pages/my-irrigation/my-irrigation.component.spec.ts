import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { MyWalkwayIrrigationStatus, NeighborIrrigationStatus, WalkwayRequestedTurn } from '../../../../../shared/models/irrigation-turn.model';
import { DetailResult } from '../../../../../shared/models/result.model';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';
import { MyIrrigationComponent } from './my-irrigation.component';

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

    function setup(): void {
        turnService = jasmine.createSpyObj('IrrigationTurnService', ['getMyWalkwayStatus']);

        TestBed.configureTestingModule({
            imports: [MyIrrigationComponent],
            providers: [{ provide: IrrigationTurnService, useValue: turnService }]
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
    });

    describe('statusLabel()', () => {
        beforeEach(() => setup());

        it('translates Watering/Completed/Waiting to the same vocabulary as the sibling "Estado de Riego"', () => {
            expect(component.statusLabel('Watering')).toBe('Regando');
            expect(component.statusLabel('Completed')).toBe('Terminado');
            expect(component.statusLabel('Waiting')).toBe('Pendiente');
        });
    });
});
