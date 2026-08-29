import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MessageModule } from 'primeng/message';
import { NeighborIrrigationStatus, NeighborTurnStatus, WalkwayRequestedTurn } from '../../../../../shared/models/irrigation-turn.model';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';

// Pantalla de solo lectura (sin acciones: solicitar/empezar/terminar turno viven en la vista
// hermana "Estado de Riego") -- espejo de MyIrrigationViewModel/MyIrrigationPage en la App: "Mi
// Riego", acotada siempre al propio andador del usuario en sesión.
@Component({
    selector: 'app-my-irrigation',
    standalone: true,
    imports: [DatePipe, MessageModule],
    templateUrl: './my-irrigation.component.html'
})
export class MyIrrigationComponent implements OnInit {
    private turnService = inject(IrrigationTurnService);

    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    // Un caller sin andador asignado (p. ej. un Presidente) recibe walkwayId:null del backend --
    // estado válido, no un error: se muestra un mensaje simple en vez de las dos secciones.
    readonly hasWalkway = signal(false);
    readonly walkwayCode = signal<string | null>(null);
    readonly requestsTomorrow = signal<WalkwayRequestedTurn[]>([]);
    readonly liveToday = signal<NeighborIrrigationStatus[]>([]);

    ngOnInit(): void {
        this.fetch();
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
        });
    }
}
