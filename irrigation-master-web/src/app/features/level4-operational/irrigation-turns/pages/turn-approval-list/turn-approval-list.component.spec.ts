import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { PendingApprovalTurn } from '../../../../../shared/models/irrigation-turn.model';
import { DetailResult, ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';
import { TurnApprovalListComponent } from './turn-approval-list.component';

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 10, organizationId: 'org-1', isDeleted: false };

const turn: PendingApprovalTurn = {
    id: 'turn-1',
    requesterId: 'user-1',
    requesterFullName: 'Ricardo Ruiz',
    hydraulicSectorId: 'sector-1',
    scheduledStart: '2026-08-25T08:00:00Z',
    scheduledEnd: '2026-08-25T09:00:00Z'
};

describe('TurnApprovalListComponent', () => {
    let component: TurnApprovalListComponent;
    let fixture: ComponentFixture<TurnApprovalListComponent>;
    let turnService: jasmine.SpyObj<IrrigationTurnService>;
    let hydraulicSectorService: jasmine.SpyObj<HydraulicSectorService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(role: string | null): void {
        turnService = jasmine.createSpyObj('IrrigationTurnService', ['listPendingApproval', 'approve']);
        turnService.listPendingApproval.and.returnValue(of<DetailResult<PendingApprovalTurn[]>>({ isSuccess: true, message: 'ok', data: [] }));
        hydraulicSectorService = jasmine.createSpyObj('HydraulicSectorService', ['list']);
        hydraulicSectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: true, message: 'ok', items: [sector], totalCount: 1 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [TurnApprovalListComponent],
            providers: [
                { provide: IrrigationTurnService, useValue: turnService },
                { provide: HydraulicSectorService, useValue: hydraulicSectorService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(TurnApprovalListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes canApprove as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.canApprove).toBe(true);
    });

    it('exposes canApprove as true for PRESIDENTE', () => {
        setup('PRESIDENTE');
        expect(component.canApprove).toBe(true);
    });

    it('exposes canApprove as true for VICEPRESIDENTE', () => {
        setup('VICEPRESIDENTE');
        expect(component.canApprove).toBe(true);
    });

    it('exposes canApprove as false for COORDINADOR_RIEGO (sin permiso TURN_APPROVE)', () => {
        setup('COORDINADOR_RIEGO');
        expect(component.canApprove).toBe(false);
    });

    describe('ngOnInit()', () => {
        it('loads the pending turns and resolves sector names by id', () => {
            setup('SUPERADMIN');
            turnService.listPendingApproval.and.returnValue(of<DetailResult<PendingApprovalTurn[]>>({ isSuccess: true, message: 'ok', data: [turn] }));

            component.ngOnInit();

            expect(component.turns()).toEqual([turn]);
            expect(component.sectorName('sector-1')).toBe('Sector Norte');
            expect(component.errorMessage()).toBeNull();
        });

        it('shows an empty table (no error) when there are no pending turns', () => {
            setup('SUPERADMIN');

            component.ngOnInit();

            expect(component.turns()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            setup('SUPERADMIN');
            turnService.listPendingApproval.and.returnValue(of<DetailResult<PendingApprovalTurn[]>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.turns()).toEqual([]);
        });
    });

    describe('approve()', () => {
        it('does not call the service when canApprove is false', () => {
            setup('COORDINADOR_RIEGO');

            component.approve(turn);

            expect(turnService.approve).not.toHaveBeenCalled();
        });

        it('on success, shows a success toast and reloads the list', () => {
            setup('SUPERADMIN');
            component.ngOnInit();
            turnService.approve.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'turn-1' }));

            component.approve(turn);

            expect(turnService.approve).toHaveBeenCalledWith('turn-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Operación completada exitosamente.' }));
            expect(turnService.listPendingApproval).toHaveBeenCalledTimes(2);
            expect(component.approvingId()).toBeNull();
        });

        it('on a backend validation failure, shows an error toast and does not reload', () => {
            setup('SUPERADMIN');
            component.ngOnInit();
            turnService.approve.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' }));

            component.approve(turn);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No tienes permiso para realizar esta acción.' }));
            expect(turnService.listPendingApproval).toHaveBeenCalledTimes(1);
        });
    });
});
