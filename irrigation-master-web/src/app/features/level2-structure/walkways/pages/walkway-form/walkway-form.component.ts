import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { HydraulicSectorService } from '../../../hydraulic-sectors/services/hydraulic-sector.service';
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
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly sectors = signal<HydraulicSector[]>([]);
    readonly sectorsLoading = signal(false);

    private walkwayId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        code: ['', Validators.required],
        length: [0, [Validators.required, Validators.min(0.01)]],
        hydraulicSectorId: ['', Validators.required]
    });

    ngOnInit(): void {
        this.loadSectors();

        this.walkwayId = this.route.snapshot.paramMap.get('id');
        if (this.walkwayId) {
            this.isEditMode.set(true);
            this.form.controls.hydraulicSectorId.disable();
            this.loadWalkway(this.walkwayId);
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
            this.walkwayService.update(this.walkwayId!, { code: value.code, length: value.length }).subscribe(onResult);
        } else {
            this.walkwayService.create(value).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/walkways']);
    }

    private loadSectors(): void {
        this.sectorsLoading.set(true);
        this.hydraulicSectorService.list(1, 100).subscribe((result) => {
            this.sectorsLoading.set(false);
            this.sectors.set(result.items);
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
