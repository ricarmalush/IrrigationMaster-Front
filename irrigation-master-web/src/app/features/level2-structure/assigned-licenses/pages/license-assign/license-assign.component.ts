import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { AssignedLicenseService } from '../../services/assigned-license.service';

@Component({
    selector: 'app-license-assign',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, SelectModule, InputNumberModule, MessageModule],
    templateUrl: './license-assign.component.html'
})
export class LicenseAssignComponent implements OnInit {
    private fb = inject(FormBuilder);
    private licenseService = inject(AssignedLicenseService);
    private organizationService = inject(OrganizationService);
    private licenceTypeService = inject(LicenceTypeService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);
    readonly licenceTypes = signal<LicenceType[]>([]);
    readonly licenceTypesLoading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        organizationId: ['', Validators.required],
        licenceTypeId: ['', Validators.required],
        durationDays: [365, [Validators.required, Validators.min(1)]]
    });

    ngOnInit(): void {
        this.organizationsLoading.set(true);
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationsLoading.set(false);
            this.organizations.set(result.items);
        });

        this.licenceTypesLoading.set(true);
        this.licenceTypeService.list(1, 100).subscribe((result) => {
            this.licenceTypesLoading.set(false);
            this.licenceTypes.set(result.items);
        });
    }

    // Al elegir un tipo de licencia, sugerimos su duracion por defecto (DurationInDays) sin
    // impedir que el SUPERADMIN la cambie para el caso concreto.
    onLicenceTypeChange(licenceTypeId: string): void {
        const licenceType = this.licenceTypes().find((t) => t.id === licenceTypeId);
        if (licenceType) {
            this.form.controls.durationDays.setValue(licenceType.durationInDays);
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

        this.licenseService.create(value).subscribe((result) => {
            this.saving.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: 'Licencia asignada', detail: result.message });
                this.router.navigate(['/licences']);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }

    cancel(): void {
        this.router.navigate(['/licences']);
    }
}
