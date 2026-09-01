import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import type { TableLazyLoadEvent } from 'primeng/types/table';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { IrrigationProgram } from '../../../../../shared/models/irrigation-program.model';
import { IrrigationProgramService } from '../../services/irrigation-program.service';

// Mismos roles que ShowIrrigationPrograms en AdminMenuPage de la App.
const IRRIGATION_PROGRAM_ROLES = ['SUPERADMIN', 'COORDINADOR_RIEGO'];

const DAY_LABELS: Record<string, string> = { '1': 'Lu', '2': 'Ma', '3': 'Mi', '4': 'Ju', '5': 'Vi', '6': 'Sa', '7': 'Do' };

@Component({
    selector: 'app-program-list',
    standalone: true,
    imports: [RouterModule, TableModule, ButtonModule, TagModule, ToolbarModule, MessageModule],
    templateUrl: './program-list.component.html'
})
export class ProgramListComponent implements OnInit {
    private programService = inject(IrrigationProgramService);
    private hydraulicSectorService = inject(HydraulicSectorService);
    private currentSession = inject(CurrentSessionService);

    readonly canEdit = IRRIGATION_PROGRAM_ROLES.includes(this.currentSession.getRole() ?? '');

    readonly programs = signal<IrrigationProgram[]>([]);
    readonly totalRecords = signal(0);
    readonly loading = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly sectorNames = signal<Record<string, string>>({});

    private lastFirst = 0;
    private lastRows = 10;

    ngOnInit(): void {
        // Solo para mostrar el nombre del sector en la lista (el DTO del backend trae el id, no el
        // nombre) -- mismo patrón que WalkwayFormComponent usa para el picker de sectores.
        this.hydraulicSectorService.list(1, 100).subscribe((result) => {
            this.sectorNames.set(Object.fromEntries(result.items.map((s) => [s.id, s.name])));
            if (!result.isSuccess) {
                // Antes, un permiso denegado aquí (mismo bug ya corregido en ProgramFormComponent)
                // se traducía en mostrar el ID crudo del sector en vez del nombre, en silencio.
                this.errorMessage.set(result.message);
            }
        });
    }

    onLazyLoad(event: TableLazyLoadEvent): void {
        this.lastFirst = event.first ?? 0;
        this.lastRows = event.rows ?? 10;
        this.fetch();
    }

    sectorName(hydraulicSectorId: string): string {
        return this.sectorNames()[hydraulicSectorId] ?? hydraulicSectorId;
    }

    daysLabel(daysOfWeek: string): string {
        return daysOfWeek
            .split(',')
            .map((day) => DAY_LABELS[day.trim()] ?? day.trim())
            .join(', ');
    }

    private fetch(): void {
        const pageNumber = Math.floor(this.lastFirst / this.lastRows) + 1;
        this.loading.set(true);

        this.programService.list(pageNumber, this.lastRows).subscribe((result) => {
            this.loading.set(false);
            this.programs.set(result.items);
            this.totalRecords.set(result.totalCount);
            this.errorMessage.set(result.isSuccess ? null : result.message);
        });
    }
}
