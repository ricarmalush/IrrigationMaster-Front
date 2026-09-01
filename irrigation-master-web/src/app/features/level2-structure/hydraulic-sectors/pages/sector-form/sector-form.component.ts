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
import { Organization } from '../../../../../shared/models/organization.model';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';

@Component({
    selector: 'app-sector-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, MessageModule],
    templateUrl: './sector-form.component.html'
})
export class SectorFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private sectorService = inject(HydraulicSectorService);
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
    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);

    private sectorId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        areaSize: [0, [Validators.required, Validators.min(0.01)]],
        organizationId: ['', Validators.required]
    });

    ngOnInit(): void {
        this.sectorId = this.route.snapshot.paramMap.get('id');
        if (this.sectorId) {
            // El selector de Organización (visible solo al crear) no aplica aquí -- pero el
            // control sigue en el FormGroup para recibir, vía patchValue en loadSector(), el
            // organizationId REAL del sector cargado. Se preserva intacto en el payload de
            // update() (ver save()): sin él, un SUPERADMIN editando un sector de otra
            // organización recibiría NotFound falso (el backend cae a su propia organización).
            this.isEditMode.set(true);
            this.form.controls.organizationId.clearValidators();
            this.form.controls.organizationId.updateValueAndValidity();
            this.loadSector(this.sectorId);
            return;
        }

        if (this.isSuperAdmin) {
            this.loadOrganizations();
        } else {
            this.form.controls.organizationId.clearValidators();
            this.form.controls.organizationId.updateValueAndValidity();
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
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Sector actualizado' : 'Sector creado', detail: result.message });
                this.router.navigate(['/hydraulic-sectors']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            // organizationId preservado tal cual venía del GET (loadSector) -- no se está editando
            // la organización del sector aquí, solo se reenvía para que el backend pueda localizar
            // el registro si es de una organización distinta a la del SUPERADMIN.
            this.sectorService.update(this.sectorId!, { id: this.sectorId!, name: value.name, areaSize: value.areaSize, organizationId: value.organizationId || undefined }).subscribe(onResult);
        } else {
            this.sectorService.create({ name: value.name, areaSize: value.areaSize, organizationId: value.organizationId || undefined }).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/hydraulic-sectors']);
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

    private loadSector(id: string): void {
        this.loading.set(true);
        this.sectorService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue(result.data);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }
}
