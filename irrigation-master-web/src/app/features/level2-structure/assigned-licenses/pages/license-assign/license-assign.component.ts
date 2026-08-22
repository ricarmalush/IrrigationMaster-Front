import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { OrganizationService } from '../../../organizations/services/organization.service';
import { AssignedLicenseService } from '../../services/assigned-license.service';

type LicenseScope = 'organization' | 'individual';

const SCOPE_OPTIONS: { label: string; value: LicenseScope }[] = [
    { label: 'Organización completa', value: 'organization' },
    { label: 'Usuario individual', value: 'individual' }
];

@Component({
    selector: 'app-license-assign',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, SelectModule, SelectButtonModule, InputNumberModule, MessageModule],
    templateUrl: './license-assign.component.html'
})
export class LicenseAssignComponent implements OnInit {
    private fb = inject(FormBuilder);
    private licenseService = inject(AssignedLicenseService);
    private organizationService = inject(OrganizationService);
    private licenceTypeService = inject(LicenceTypeService);
    private userService = inject(UserService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly scopeOptions = SCOPE_OPTIONS;

    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);
    readonly licenceTypes = signal<LicenceType[]>([]);
    readonly licenceTypesLoading = signal(false);
    readonly users = signal<AppUser[]>([]);
    readonly usersLoading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        scope: this.fb.nonNullable.control<LicenseScope>('organization'),
        organizationId: ['', Validators.required],
        licenceTypeId: ['', Validators.required],
        userId: [''],
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

    // Cambiar de organización invalida cualquier usuario ya elegido (pertenecía a la anterior) y
    // recarga el catálogo de usuarios de la nueva.
    onOrganizationChange(organizationId: string): void {
        this.form.controls.userId.setValue('');
        this.users.set([]);
        if (this.form.controls.scope.value === 'individual' && organizationId) {
            this.loadUsers(organizationId);
        }
    }

    onScopeChange(scope: LicenseScope): void {
        if (scope === 'organization') {
            this.form.controls.userId.setValue('');
            this.users.set([]);
            return;
        }

        const organizationId = this.form.controls.organizationId.value;
        if (organizationId) {
            this.loadUsers(organizationId);
        }
    }

    save(): void {
        const isIndividual = this.form.controls.scope.value === 'individual';
        if (this.form.invalid || (isIndividual && !this.form.controls.userId.value)) {
            this.form.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.errorMessage.set(null);
        const value = this.form.getRawValue();

        this.licenseService
            .create({
                organizationId: value.organizationId,
                licenceTypeId: value.licenceTypeId,
                durationDays: value.durationDays,
                userId: isIndividual ? value.userId : null
            })
            .subscribe((result) => {
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

    private loadUsers(organizationId: string): void {
        this.usersLoading.set(true);
        this.userService.list(1, 100, undefined, organizationId).subscribe((result) => {
            this.usersLoading.set(false);
            this.users.set(result.items);
        });
    }
}
