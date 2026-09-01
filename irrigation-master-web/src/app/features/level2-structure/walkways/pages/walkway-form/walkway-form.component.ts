import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { CurrentSessionService } from '../../../../../core/services/current-session';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { HydraulicSectorService } from '../../../hydraulic-sectors/services/hydraulic-sector.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { WalkwayService } from '../../services/walkway.service';

@Component({
    selector: 'app-walkway-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, MessageModule],
    templateUrl: './walkway-form.component.html'
})
export class WalkwayFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private walkwayService = inject(WalkwayService);
    private hydraulicSectorService = inject(HydraulicSectorService);
    private organizationService = inject(OrganizationService);
    private currentSession = inject(CurrentSessionService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    // Modelo híbrido de resolución de OrganizationId (mismo patrón que CreateUserCommand): solo
    // SUPERADMIN puede elegir la organización destino -- cualquier otro autenticado siempre crea
    // en la suya propia vía ICurrentUser, sin selector.
    readonly isSuperAdmin = this.currentSession.getRole() === 'SUPERADMIN';

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly sectors = signal<HydraulicSector[]>([]);
    readonly sectorsLoading = signal(false);
    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);

    private walkwayId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        length: [0, [Validators.required, Validators.min(0.01)]],
        hydraulicSectorId: ['', Validators.required],
        organizationId: ['', Validators.required]
    });

    ngOnInit(): void {
        this.walkwayId = this.route.snapshot.paramMap.get('id');

        if (this.walkwayId) {
            // El selector de Organización (visible solo al crear) no aplica aquí -- pero el
            // control sigue en el FormGroup para recibir, vía patchValue en loadWalkway(), el
            // organizationId REAL del andador cargado. Se preserva intacto en el payload de
            // update() (ver save()): sin él, un SUPERADMIN editando un andador de otra
            // organización recibiría NotFound falso (el backend cae a su propia organización).
            // Los sectores se cargan sin filtro: el andador ya pertenece a uno concreto.
            this.isEditMode.set(true);
            this.form.controls.hydraulicSectorId.disable();
            this.form.controls.organizationId.clearValidators();
            this.form.controls.organizationId.updateValueAndValidity();
            this.loadSectors();
            this.loadWalkway(this.walkwayId);
            return;
        }

        if (this.isSuperAdmin) {
            // Sin organización elegida todavía, el desplegable de sectores arranca vacío -- cargar
            // sin filtro mostraría los sectores de la propia organización del SUPERADMIN, no los
            // de la organización que finalmente elija.
            this.loadOrganizations();
        } else {
            this.form.controls.organizationId.clearValidators();
            this.form.controls.organizationId.updateValueAndValidity();
            this.loadSectors();
        }
    }

    onOrganizationChange(organizationId: string): void {
        this.form.controls.hydraulicSectorId.setValue('');
        this.sectors.set([]);
        if (organizationId) {
            this.loadSectors(organizationId);
        }
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMessage.set(null);
        const value = this.form.getRawValue();

        const onResult = (result: { isSuccess: boolean; message: string }) => {
            this.saving.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Andador actualizado' : 'Andador creado', detail: result.message });
                this.router.navigate(['/walkways']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            // organizationId preservado tal cual venía del GET (loadWalkway) -- no se está
            // editando la organización del andador aquí, solo se reenvía para que el backend
            // pueda localizar el registro si es de una organización distinta a la del SUPERADMIN.
            this.walkwayService.update(this.walkwayId!, { code: value.code, length: value.length, organizationId: value.organizationId || undefined }).subscribe(onResult);
        } else {
            this.walkwayService
                .create({ code: value.code, length: value.length, hydraulicSectorId: value.hydraulicSectorId, organizationId: value.organizationId || undefined })
                .subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/walkways']);
    }

    private loadOrganizations(): void {
        this.organizationsLoading.set(true);
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationsLoading.set(false);
            this.organizations.set(result.items);
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadSectors(organizationId?: string): void {
        this.sectorsLoading.set(true);
        this.hydraulicSectorService.list(1, 100, organizationId).subscribe((result) => {
            this.sectorsLoading.set(false);
            this.sectors.set(result.items);
            if (!result.isSuccess) {
                this.errorMessage.set(result.message);
            }
        });
    }

    private loadWalkway(id: string): void {
        this.loading.set(true);
        this.walkwayService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue(result.data);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }
}
