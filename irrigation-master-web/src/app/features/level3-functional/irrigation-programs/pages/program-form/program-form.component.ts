import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { CreateIrrigationProgramRequest, UpdateIrrigationProgramRequest } from '../../../../../shared/models/irrigation-program.model';
import { HydraulicSectorService } from '../../../../level2-structure/hydraulic-sectors/services/hydraulic-sector.service';
import { IrrigationProgramService } from '../../services/irrigation-program.service';

// Mismos roles que ShowIrrigationPrograms en AdminMenuPage de la App.
const IRRIGATION_PROGRAM_ROLES = ['SUPERADMIN', 'COORDINADOR_RIEGO'];

const DAY_OPTIONS = [
    { value: 1, label: 'Lunes' },
    { value: 2, label: 'Martes' },
    { value: 3, label: 'Miércoles' },
    { value: 4, label: 'Jueves' },
    { value: 5, label: 'Viernes' },
    { value: 6, label: 'Sábado' },
    { value: 7, label: 'Domingo' }
];

interface SeasonFormValue {
    startMonth: number | null;
    startDay: number | null;
    endMonth: number | null;
    endDay: number | null;
}

// Mismo criterio "todo o nada" que valida el backend (IrrigationProgramValidatorExtensions.
// ApplySeasonRules) y la App (TryParseSeason): los 4 campos vacíos es válido, una mezcla no.
function seasonAllOrNothingValidator(group: AbstractControl): ValidationErrors | null {
    const { startMonth, startDay, endMonth, endDay } = group.value as SeasonFormValue;
    const filled = [startMonth, startDay, endMonth, endDay].filter((v) => v !== null && v !== undefined).length;
    return filled === 0 || filled === 4 ? null : { seasonIncomplete: true };
}

@Component({
    selector: 'app-program-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, MessageModule, DatePickerModule, ToggleSwitchModule],
    templateUrl: './program-form.component.html'
})
export class ProgramFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private programService = inject(IrrigationProgramService);
    private hydraulicSectorService = inject(HydraulicSectorService);
    private currentSession = inject(CurrentSessionService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly canEdit = IRRIGATION_PROGRAM_ROLES.includes(this.currentSession.getRole() ?? '');
    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly sectors = signal<HydraulicSector[]>([]);
    readonly sectorsLoading = signal(false);
    readonly dayOptions = DAY_OPTIONS;
    readonly selectedDays = signal<Set<number>>(new Set());
    readonly daysTouched = signal(false);

    private programId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(150)]],
        startTime: [this.defaultStartTime(), Validators.required],
        durationMinutes: [0, [Validators.required, Validators.min(1)]],
        hydraulicSectorId: ['', Validators.required],
        isActive: [true],
        season: this.fb.group(
            {
                startMonth: this.fb.control<number | null>(null),
                startDay: this.fb.control<number | null>(null),
                endMonth: this.fb.control<number | null>(null),
                endDay: this.fb.control<number | null>(null)
            },
            { validators: seasonAllOrNothingValidator }
        )
    });

    // Bug real: "Día inicio"/"Día fin" aceptaban 1-31 sin importar el mes elegido (p. ej. mes 11 +
    // día 31, que no existe) -- el backend lo rechazaba correctamente pero Angular no lo impedía en
    // el propio formulario. maxStartDay/maxEndDay reaccionan al mes elegido para acotar el máximo
    // real (28/29/30/31, año 2000 fijo como bisiesto -- mismo criterio que IsValidMonthDay en
    // IrrigationProgramValidatorExtensions del backend). El recorte del día ya introducido se hace
    // con una suscripción directa a valueChanges (no effect()): así es síncrono con setValue(), sin
    // depender de que algo dispare un ciclo de detección de cambios.
    private readonly startMonthValue = toSignal(this.form.controls.season.controls.startMonth.valueChanges, {
        initialValue: this.form.controls.season.controls.startMonth.value
    });
    private readonly endMonthValue = toSignal(this.form.controls.season.controls.endMonth.valueChanges, {
        initialValue: this.form.controls.season.controls.endMonth.value
    });
    readonly maxStartDay = computed(() => this.daysInMonth(this.startMonthValue()));
    readonly maxEndDay = computed(() => this.daysInMonth(this.endMonthValue()));

    constructor() {
        this.form.controls.season.controls.startMonth.valueChanges.subscribe((month) =>
            this.clampDay(this.form.controls.season.controls.startDay, this.daysInMonth(month))
        );
        this.form.controls.season.controls.endMonth.valueChanges.subscribe((month) =>
            this.clampDay(this.form.controls.season.controls.endDay, this.daysInMonth(month))
        );
    }

    ngOnInit(): void {
        this.loadSectors();

        if (!this.canEdit) {
            this.form.disable();
        }

        this.programId = this.route.snapshot.paramMap.get('id');
        if (this.programId) {
            this.isEditMode.set(true);
            this.form.controls.hydraulicSectorId.disable();
            this.loadProgram(this.programId);
        }
    }

    toggleDay(day: number): void {
        if (!this.canEdit) {
            return;
        }

        this.daysTouched.set(true);
        const next = new Set(this.selectedDays());
        if (next.has(day)) {
            next.delete(day);
        } else {
            next.add(day);
        }
        this.selectedDays.set(next);
    }

    save(): void {
        this.daysTouched.set(true);

        if (!this.canEdit || this.form.invalid || this.selectedDays().size === 0) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMessage.set(null);

        const value = this.form.getRawValue();
        const daysOfWeek = [...this.selectedDays()].sort((a, b) => a - b).join(',');
        const startTime = this.toTimeString(value.startTime);
        const season = this.seasonPayload(value.season);

        const onResult = (result: { isSuccess: boolean; message: string }) => {
            this.saving.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Programa actualizado' : 'Programa creado', detail: result.message });
                this.router.navigate(['/irrigation-programs']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            const request: UpdateIrrigationProgramRequest = {
                id: this.programId!,
                name: value.name,
                startTime,
                durationMinutes: value.durationMinutes,
                daysOfWeek,
                isActive: value.isActive,
                ...season
            };
            this.programService.update(this.programId!, request).subscribe(onResult);
        } else {
            const request: CreateIrrigationProgramRequest = {
                name: value.name,
                startTime,
                durationMinutes: value.durationMinutes,
                daysOfWeek,
                hydraulicSectorId: value.hydraulicSectorId,
                ...season
            };
            this.programService.create(request).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/irrigation-programs']);
    }

    private seasonPayload(season: SeasonFormValue) {
        const allEmpty = season.startMonth === null && season.startDay === null && season.endMonth === null && season.endDay === null;
        return allEmpty
            ? { seasonStartMonth: null, seasonStartDay: null, seasonEndMonth: null, seasonEndDay: null }
            : { seasonStartMonth: season.startMonth, seasonStartDay: season.startDay, seasonEndMonth: season.endMonth, seasonEndDay: season.endDay };
    }

    private loadSectors(): void {
        this.sectorsLoading.set(true);
        this.hydraulicSectorService.list(1, 100).subscribe((result) => {
            this.sectorsLoading.set(false);
            this.sectors.set(result.items);
            if (!result.isSuccess) {
                // El bug real que motivó VIEW_HYDRAULIC_SECTORS: un permiso denegado aquí dejaba
                // el desplegable "Selecciona un sector" vacío en silencio ("No results found"),
                // indistinguible de "esta organización no tiene sectores".
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadProgram(id: string): void {
        this.loading.set(true);
        this.programService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                const program = result.data;
                this.form.patchValue({
                    name: program.name,
                    startTime: this.parseTimeString(program.startTime),
                    durationMinutes: program.durationMinutes,
                    hydraulicSectorId: program.hydraulicSectorId,
                    isActive: program.isActive,
                    season: {
                        startMonth: program.seasonStartMonth ?? null,
                        startDay: program.seasonStartDay ?? null,
                        endMonth: program.seasonEndMonth ?? null,
                        endDay: program.seasonEndDay ?? null
                    }
                });
                this.selectedDays.set(new Set(program.daysOfWeek.split(',').filter(Boolean).map(Number)));
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }

    // Año bisiesto fijo (2000, igual que el backend) para que Febrero admita el día 29. Sin mes
    // elegido todavía, se mantiene el máximo de 31 (comportamiento previo) para no bloquear al
    // usuario antes de que seleccione uno.
    private daysInMonth(month: number | null): number {
        if (!month || month < 1 || month > 12) {
            return 31;
        }
        return new Date(2000, month, 0).getDate();
    }

    private clampDay(control: AbstractControl<number | null>, max: number): void {
        if ((control.value ?? 0) > max) {
            control.setValue(max);
        }
    }

    private defaultStartTime(): Date {
        const date = new Date();
        date.setHours(6, 0, 0, 0);
        return date;
    }

    private toTimeString(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
    }

    private parseTimeString(value: string): Date {
        const [hours, minutes] = value.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}
