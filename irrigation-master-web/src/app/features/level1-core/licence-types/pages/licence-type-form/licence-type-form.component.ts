import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { SystemLevel } from '../../../../../shared/models/licence-type.model';
import { LicenceTypeService } from '../../services/licence-type.service';

const MAX_LEVEL_OPTIONS: { label: string; value: SystemLevel }[] = [
    { label: 'Core (Nivel 1)', value: 'Core' },
    { label: 'Estructura (Nivel 2)', value: 'Structure' },
    { label: 'Planificación (Nivel 3)', value: 'Planning' },
    { label: 'Operacional (Nivel 4)', value: 'Operational' },
    { label: 'Administrativo (Nivel 5)', value: 'Administrative' }
];

@Component({
    selector: 'app-licence-type-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, InputNumberModule, SelectModule, CheckboxModule, TextareaModule, MessageModule],
    templateUrl: './licence-type-form.component.html'
})
export class LicenceTypeFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private licenceTypeService = inject(LicenceTypeService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly maxLevelOptions = MAX_LEVEL_OPTIONS;

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    private licenceTypeId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        licenseCode: ['', Validators.required],
        description: ['', Validators.maxLength(500)],
        durationInDays: [365, [Validators.required, Validators.min(1)]],
        priceAmount: [0, [Validators.required, Validators.min(0)]],
        priceCurrency: ['EUR', Validators.required],
        isUsageBased: [false],
        maxLevelAllowed: this.fb.nonNullable.control<SystemLevel>('Core', Validators.required)
    });

    ngOnInit(): void {
        this.licenceTypeId = this.route.snapshot.paramMap.get('id');
        if (this.licenceTypeId) {
            this.isEditMode.set(true);
            this.loadLicenceType(this.licenceTypeId);
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
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Tipo de licencia actualizado' : 'Tipo de licencia creado', detail: result.message });
                this.router.navigate(['/licence-types']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            this.licenceTypeService.update(this.licenceTypeId!, { id: this.licenceTypeId!, ...value }).subscribe(onResult);
        } else {
            this.licenceTypeService.create(value).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/licence-types']);
    }

    private loadLicenceType(id: string): void {
        this.loading.set(true);
        this.licenceTypeService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue(result.data);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }
}
