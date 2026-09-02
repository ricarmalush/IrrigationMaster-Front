import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { PendingApprovalTurn, PendingApprovalTurnsByWalkway } from '../../../../../shared/models/irrigation-turn.model';
import { IrrigationTurnService } from '../../services/irrigation-turn.service';

// Mismos roles que ShowApproveTurns en AdminMenuPage de la App -- Coordinador de Riego queda
// fuera a propósito (el backend no le da el permiso TURN_APPROVE).
const APPROVE_TURN_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'VICEPRESIDENTE'];

@Component({
    selector: 'app-turn-approval-list',
    standalone: true,
    imports: [TableModule, ButtonModule, ToolbarModule, MessageModule, DatePipe],
    templateUrl: './turn-approval-list.component.html'
})
export class TurnApprovalListComponent implements OnInit {
    private turnService = inject(IrrigationTurnService);
    private hydraulicSectorService = inject(HydraulicSectorService);
    private currentSession = inject(CurrentSessionService);
    private messageService = inject(MessageService);

    readonly canApprove = APPROVE_TURN_ROLES.includes(this.currentSession.getRole() ?? '');

    // Ya viene agrupado por andador desde el backend (GetPendingApprovalIrrigationTurnsHandler),
    // solo con los andadores que tienen algún turno pendiente y ya ordenado por prioridad
    // (HouseNumber descendente, ThenBy hora de solicitud) dentro de cada grupo.
    readonly groups = signal<PendingApprovalTurnsByWalkway[]>([]);
    readonly loading = signal(false);
    readonly approvingId = signal<string | null>(null);
    readonly errorMessage = signal<string | null>(null);
    readonly sectorNames = signal<Record<string, string>>({});

    ngOnInit(): void {
        this.hydraulicSectorService.list(1, 100).subscribe((result) => {
            this.sectorNames.set(Object.fromEntries(result.items.map((s) => [s.id, s.name])));
        });
        this.fetch();
    }

    sectorName(hydraulicSectorId: string): string {
        return this.sectorNames()[hydraulicSectorId] ?? hydraulicSectorId;
    }

    // Sin confirmación previa y con recarga completa tras el éxito -- mismo comportamiento que
    // ApproveTurnsViewModel.ApproveAsync en la App, no una decisión nueva del Front.
    approve(turn: PendingApprovalTurn): void {
        if (!this.canApprove) {
            return;
        }

        this.approvingId.set(turn.id);
        this.turnService.approve(turn.id).subscribe((result) => {
            this.approvingId.set(null);
            this.messageService.add({
                severity: result.isSuccess ? 'success' : 'error',
                summary: result.isSuccess ? 'Turno aprobado' : 'No se pudo aprobar',
                detail: result.message
            });
            if (result.isSuccess) {
                this.fetch();
            }
        });
    }

    private fetch(): void {
        this.loading.set(true);
        this.errorMessage.set(null);

        this.turnService.listPendingApproval().subscribe((result) => {
            this.loading.set(false);
            this.groups.set(result.data ?? []);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
