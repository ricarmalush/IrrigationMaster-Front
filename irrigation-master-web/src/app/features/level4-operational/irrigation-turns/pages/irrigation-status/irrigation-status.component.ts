import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { forkJoin, of } from 'rxjs';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { IrrigationProgram } from '../../../../../shared/models/irrigation-program.model';
import { NeighborIrrigationStatus, WalkwayIrrigationStatus } from '../../../../../shared/models/irrigation-turn.model';
import { OperationResult } from '../../../../../shared/models/result.model';
import { IrrigationProgramService } from '../../../../level3-functional/irrigation-programs/services/irrigation-program.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';

const DAY_LABELS: Record<string, string> = {
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
    '7': 'Domingo'
};

const MONTH_LABELS: Record<number, string> = {
    1: 'enero',
    2: 'febrero',
    3: 'marzo',
    4: 'abril',
    5: 'mayo',
    6: 'junio',
    7: 'julio',
    8: 'agosto',
    9: 'septiembre',
    10: 'octubre',
    11: 'noviembre',
    12: 'diciembre'
};

const NO_IRRIGATION_TODAY_MESSAGE = 'No hay riego programado hoy.';
const NO_ACTIVITY_YET_MESSAGE = 'Sin actividad todavía.';

// Duración fija de 2h desde "ahora + 1 min" -- espejo exacto de IrrigationStatusViewModel.RequestTurnAsync
// en la App: sin selector de hora, se solicita siempre así.
const REQUEST_TURN_DELAY_MS = 60_000;
const REQUEST_TURN_DURATION_HOURS = 2;

@Component({
    selector: 'app-irrigation-status',
    standalone: true,
    imports: [ButtonModule, MessageModule, DatePipe],
    templateUrl: './irrigation-status.component.html'
})
export class IrrigationStatusComponent implements OnInit {
    private turnService = inject(IrrigationTurnService);
    private irrigationProgramService = inject(IrrigationProgramService);
    private walkwayService = inject(WalkwayService);
    private userService = inject(UserService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    private readonly myUserId = this.currentSession.getUserId();

    readonly walkways = signal<WalkwayIrrigationStatus[]>([]);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly myWalkwayId = signal<string | null>(null);
    readonly sectorByWalkway = signal<Record<string, string>>({});
    readonly patternBySector = signal<Record<string, string>>({});
    readonly emptyStateMessages = signal<Record<string, string>>({});
    readonly requestingWalkwayId = signal<string | null>(null);
    readonly actingTurnId = signal<string | null>(null);

    ngOnInit(): void {
        this.fetch();
    }

    isMine(neighbor: NeighborIrrigationStatus): boolean {
        return neighbor.userId === this.myUserId;
    }

    // Espejo de CanRequestTurn en la App: solo en tu propio andador, y solo si hoy no tienes
    // ningún turno todavía (en cualquier estado).
    canRequestTurn(walkway: WalkwayIrrigationStatus): boolean {
        return !!this.myWalkwayId() && this.myWalkwayId() === walkway.walkwayId && !walkway.neighbors.some((n) => this.isMine(n));
    }

    canStart(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Waiting' && neighbor.isApproved;
    }

    canComplete(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Watering';
    }

    showsWaitingApproval(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Waiting' && !neighbor.isApproved;
    }

    statusLabel(status: NeighborIrrigationStatus['status']): string {
        switch (status) {
            case 'Watering':
                return 'Regando';
            case 'Completed':
                return 'Terminado';
            default:
                return 'Pendiente';
        }
    }

    pattern(walkwayId: string): string | null {
        const sectorId = this.sectorByWalkway()[walkwayId];
        return sectorId ? (this.patternBySector()[sectorId] ?? null) : null;
    }

    emptyStateMessage(walkwayId: string): string {
        return this.emptyStateMessages()[walkwayId] ?? NO_ACTIVITY_YET_MESSAGE;
    }

    requestTurn(walkway: WalkwayIrrigationStatus): void {
        const sectorId = this.sectorByWalkway()[walkway.walkwayId];
        if (!this.canRequestTurn(walkway) || !sectorId || !this.myUserId) {
            return;
        }

        const start = new Date(Date.now() + REQUEST_TURN_DELAY_MS);
        const end = new Date(start.getTime() + REQUEST_TURN_DURATION_HOURS * 60 * 60 * 1000);

        this.requestingWalkwayId.set(walkway.walkwayId);
        this.turnService
            .request({
                hydraulicSectorId: sectorId,
                requesterId: this.myUserId,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            })
            .subscribe((result) => {
                this.requestingWalkwayId.set(null);
                this.notify(result, 'Turno solicitado', 'No se pudo solicitar el turno');
                if (result.isSuccess) {
                    this.fetch();
                }
            });
    }

    startTurn(neighbor: NeighborIrrigationStatus): void {
        if (!this.canStart(neighbor)) {
            return;
        }

        this.actingTurnId.set(neighbor.turnId);
        this.turnService.start(neighbor.turnId).subscribe((result) => {
            this.actingTurnId.set(null);
            this.notify(result, 'Turno iniciado', 'No se pudo iniciar el turno');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    completeTurn(neighbor: NeighborIrrigationStatus): void {
        if (!this.canComplete(neighbor)) {
            return;
        }

        this.actingTurnId.set(neighbor.turnId);
        this.turnService.complete(neighbor.turnId).subscribe((result) => {
            this.actingTurnId.set(null);
            this.notify(result, 'Turno terminado', 'No se pudo terminar el turno');
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    private notify(result: OperationResult<boolean | string>, successSummary: string, failureSummary: string): void {
        this.messageService.add({
            severity: result.isSuccess ? 'success' : 'error',
            summary: result.isSuccess ? successSummary : failureSummary,
            detail: result.message
        });
    }

    private fetch(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        forkJoin({
            profile: this.myUserId ? this.userService.getById(this.myUserId) : of(null),
            walkways: this.walkwayService.list(1, 100),
            programs: this.irrigationProgramService.list(1, 100),
            status: this.turnService.getOrganizationStatus()
        }).subscribe(({ profile, walkways, programs, status }) => {
            this.loading.set(false);
            this.myWalkwayId.set(profile?.data?.walkwayId ?? null);

            const sectorByWalkway = Object.fromEntries(walkways.items.map((w) => [w.id, w.hydraulicSectorId]));
            this.sectorByWalkway.set(sectorByWalkway);
            this.patternBySector.set(this.buildPatternsBySector(programs.items));

            const walkwayStatuses = status.data ?? [];
            this.walkways.set(walkwayStatuses);
            this.errorMessage.set(status.isSuccess ? null : status.message);

            this.loadEmptyStateMessages(walkwayStatuses, sectorByWalkway);
        });
    }

    private loadEmptyStateMessages(walkways: WalkwayIrrigationStatus[], sectorByWalkway: Record<string, string>): void {
        const emptyWalkways = walkways.filter((w) => w.neighbors.length === 0);
        if (emptyWalkways.length === 0) {
            return;
        }

        const checks = Object.fromEntries(
            emptyWalkways.map((w) => {
                const sectorId = sectorByWalkway[w.walkwayId];
                return [w.walkwayId, sectorId ? this.irrigationProgramService.isIrrigationDay(sectorId) : of<OperationResult<boolean>>({ isSuccess: false, message: '' })];
            })
        );

        forkJoin(checks).subscribe((results) => {
            const messages: Record<string, string> = {};
            for (const [walkwayId, result] of Object.entries(results)) {
                // Fail-soft: si no se pudo resolver el sector o la consulta falla, se asume que
                // puede haber actividad más tarde -- mismo criterio que la App.
                messages[walkwayId] = result.isSuccess && result.data === false ? NO_IRRIGATION_TODAY_MESSAGE : NO_ACTIVITY_YET_MESSAGE;
            }
            this.emptyStateMessages.set(messages);
        });
    }

    private buildPatternsBySector(programs: IrrigationProgram[]): Record<string, string> {
        const bySector: Record<string, IrrigationProgram[]> = {};
        for (const program of programs.filter((p) => p.isActive)) {
            (bySector[program.hydraulicSectorId] ??= []).push(program);
        }

        return Object.fromEntries(Object.entries(bySector).map(([sectorId, list]) => [sectorId, `Este sector riega: ${list.map((p) => this.describeProgram(p)).join(' · ')}`]));
    }

    private describeProgram(program: IrrigationProgram): string {
        const days = program.daysOfWeek
            .split(',')
            .map((d) => DAY_LABELS[d.trim()])
            .filter(Boolean)
            .join(', ');

        if (!program.seasonStartMonth || !program.seasonEndMonth) {
            return days;
        }

        return `${days} (de ${MONTH_LABELS[program.seasonStartMonth]} a ${MONTH_LABELS[program.seasonEndMonth]})`;
    }
}
