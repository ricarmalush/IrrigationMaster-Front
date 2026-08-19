import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';

@Component({
    selector: 'app-sector-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, MessageModule],
    templateUrl: './sector-form.component.html'
})
export class SectorFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private sectorService = inject(HydraulicSectorService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    private sectorId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        areaSize: [0, [Validators.required, Validators.min(0.01)]]
    });

    ngOnInit(): void {
        this.sectorId = this.route.snapshot.paramMap.get('id');
        if (this.sectorId) {
            this.isEditMode.set(true);
            this.loadSector(this.sectorId);
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
            this.sectorService.update(this.sectorId!, { id: this.sectorId!, ...value }).subscribe(onResult);
        } else {
            this.sectorService.create(value).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/hydraulic-sectors']);
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
