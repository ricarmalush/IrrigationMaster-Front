import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { NeighborIrrigationStatus, NeighborTurnStatus, WalkwayRequestedTurn } from '../../../../../shared/models/irrigation-turn.model';
import { OperationResult } from '../../../../../shared/models/result.model';
import { WalkwayService } from '../../../../level2-structure/walkways/services/walkway.service';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';

// Duración fija de 2h desde "ahora + 1 min" -- espejo exacto de requestTurn en
// IrrigationStatusComponent (vista hermana "Estado de Riego"), donde vivía originalmente esta
// acción antes de que "Estado de Riego" para Vecino pasara a apuntar aquí.
const REQUEST_TURN_DELAY_MS = 60_000;
const REQUEST_TURN_DURATION_HOURS = 2;

// Antes puramente de solo lectura (salvo "Solicitar mi turno") -- ahora "Mi Riego" también ofrece
// Empezar/Cancelar/Terminar sobre liveToday: para Vecino, esta pantalla ES su "Estado de Riego"
// (ver app.menu.ts) y es la ÚNICA a la que tiene acceso, así que necesita las mismas acciones que
// ya existían en la vista hermana "Estado de Riego" -- de lo contrario un Vecino no tendría forma
// de empezar ni terminar su propio turno. El ciclo ya no tiene aprobación intermedia: cualquier
// turno propio en Waiting (Requested) admite Empezar o Cancelar; tras Empezar, solo Terminar.
@Component({
    selector: 'app-my-irrigation',
    standalone: true,
    imports: [DatePipe, ButtonModule, MessageModule],
    templateUrl: './my-irrigation.component.html'
})
export class MyIrrigationComponent implements OnInit {
    private turnService = inject(IrrigationTurnService);
    private walkwayService = inject(WalkwayService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    private readonly myUserId = this.currentSession.getUserId();

    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    // Un caller sin andador asignado (p. ej. un Presidente) recibe walkwayId:null del backend --
    // estado válido, no un error: se muestra un mensaje simple en vez de las dos secciones.
    readonly hasWalkway = signal(false);
    readonly walkwayCode = signal<string | null>(null);
    readonly requestsTomorrow = signal<WalkwayRequestedTurn[]>([]);
    readonly liveToday = signal<NeighborIrrigationStatus[]>([]);
    readonly hydraulicSectorId = signal<string | null>(null);
    readonly requestingTurn = signal(false);
    readonly actingTurnId = signal<string | null>(null);

    ngOnInit(): void {
        this.fetch();
    }

    isMine(neighbor: NeighborIrrigationStatus): boolean {
        return neighbor.userId === this.myUserId;
    }

    // Mismo vocabulario que IrrigationStatusComponent.statusLabel (vista hermana "Estado de Riego").
    statusLabel(status: NeighborTurnStatus): string {
        switch (status) {
            case 'Watering':
                return 'Regando';
            case 'Completed':
                return 'Terminado';
            default:
                return 'Pendiente';
        }
    }

    // Espejo exacto de IrrigationStatusComponent.canRequestTurn: solo si hoy no tienes ya ningún
    // turno (en cualquier estado) en tu propio andador -- aquí liveToday ya está acotado siempre
    // al propio andador del llamador (server-side), así que no hace falta comparar walkwayId.
    canRequestTurn(): boolean {
        return !!this.hydraulicSectorId() && !this.liveToday().some((n) => n.userId === this.myUserId);
    }

    // Ya no exige aprobación previa -- confirmado con el Presidente, ese paso desaparece del ciclo
    // por completo. Espejo exacto de IrrigationStatusComponent.canStart/canCancel/canComplete.
    canStart(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Waiting';
    }

    canCancel(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Waiting';
    }

    canComplete(neighbor: NeighborIrrigationStatus): boolean {
        return this.isMine(neighbor) && neighbor.status === 'Watering';
    }

    requestTurn(): void {
        const sectorId = this.hydraulicSectorId();
        if (!this.canRequestTurn() || !sectorId || !this.myUserId) {
            return;
        }

        const start = new Date(Date.now() + REQUEST_TURN_DELAY_MS);
        const end = new Date(start.getTime() + REQUEST_TURN_DURATION_HOURS * 60 * 60 * 1000);

        this.requestingTurn.set(true);
        this.turnService
            .request({
                hydraulicSectorId: sectorId,
                requesterId: this.myUserId,
                startTime: start.toISOString(),
                endTime: end.toISOString()
            })
            .subscribe((result) => {
                this.requestingTurn.set(false);
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

    cancelTurn(neighbor: NeighborIrrigationStatus): void {
        if (!this.canCancel(neighbor)) {
            return;
        }

        this.actingTurnId.set(neighbor.turnId);
        this.turnService.cancel(neighbor.turnId).subscribe((result) => {
            this.actingTurnId.set(null);
            this.notify(result, 'Turno cancelado', 'No se pudo cancelar el turno');
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

        this.turnService.getMyWalkwayStatus().subscribe((result) => {
            this.loading.set(false);
            const data = result.data;
            this.hasWalkway.set(!!data?.walkwayId);
            this.walkwayCode.set(data?.walkwayCode ?? null);
            this.requestsTomorrow.set(data?.requestsTomorrow ?? []);
            this.liveToday.set(data?.liveToday ?? []);
            this.errorMessage.set(result.isSuccess ? null : result.message);

            if (data?.walkwayId) {
                this.loadHydraulicSectorId(data.walkwayId);
            } else {
                this.hydraulicSectorId.set(null);
            }
        });
    }

    private loadHydraulicSectorId(walkwayId: string): void {
        this.walkwayService.getById(walkwayId).subscribe((result) => {
            this.hydraulicSectorId.set(result.data?.hydraulicSectorId ?? null);
        });
    }
}
