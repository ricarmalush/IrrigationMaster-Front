import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AssignedLicense } from '../../../../../shared/models/assigned-license.model';
import { Organization } from '../../../../../shared/models/organization.model';
import { AppUser } from '../../../../../shared/models/user.model';
import { LicenceTypeService } from '../../../../level1-core/licence-types/services/licence-type.service';
import { AssignedLicenseService } from '../../../../level2-structure/assigned-licenses/services/assigned-license.service';
import { OrganizationService } from '../../../../level2-structure/organizations/services/organization.service';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { InvoiceService } from '../../services/invoice.service';

type InvoiceScope = 'organization' | 'individual';

const SCOPE_OPTIONS: { label: string; value: InvoiceScope }[] = [
    { label: 'Organización completa', value: 'organization' },
    { label: 'Usuario individual', value: 'individual' }
];

@Component({
    selector: 'app-invoice-create',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, SelectModule, SelectButtonModule, InputNumberModule, InputTextModule, DatePickerModule, MessageModule],
    templateUrl: './invoice-create.component.html'
})
export class InvoiceCreateComponent implements OnInit {
    private fb = inject(FormBuilder);
    private invoiceService = inject(InvoiceService);
    private organizationService = inject(OrganizationService);
    private userService = inject(UserService);
    private assignedLicenseService = inject(AssignedLicenseService);
    private licenceTypeService = inject(LicenceTypeService);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly scopeOptions = SCOPE_OPTIONS;

    readonly organizations = signal<Organization[]>([]);
    readonly organizationsLoading = signal(false);
    readonly users = signal<AppUser[]>([]);
    readonly usersLoading = signal(false);
    readonly licenses = signal<AssignedLicense[]>([]);
    readonly licensesLoading = signal(false);
    readonly licenceTypeNames = signal<Record<string, string>>({});
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    // Opciones legibles para el selector opcional de licencia de origen: tipo de licencia resuelto
    // + fecha de fin, igual que el criterio de resolución en cliente ya usado en license-list.
    readonly licenseOptions = computed(() =>
        this.licenses().map((l) => ({
            id: l.id,
            label: `${this.licenceTypeNames()[l.licenceTypeId] ?? l.licenceTypeId} (vence ${l.endDate.slice(0, 10)})`
        }))
    );

    readonly form = this.fb.nonNullable.group({
        scope: this.fb.nonNullable.control<InvoiceScope>('organization'),
        organizationId: ['', Validators.required],
        userId: [''],
        assignedLicenseId: [''],
        invoiceNumber: ['', Validators.required],
        issueDate: this.fb.nonNullable.control<Date>(new Date(), Validators.required),
        dueDate: this.fb.nonNullable.control<Date>(new Date(), Validators.required),
        totalAmountValue: [0, [Validators.required, Validators.min(0.01)]],
        totalAmountCurrency: ['EUR', Validators.required]
    });

    ngOnInit(): void {
        this.organizationsLoading.set(true);
        this.organizationService.list(1, 100).subscribe((result) => {
            this.organizationsLoading.set(false);
            this.organizations.set(result.items);
        });

        this.licenceTypeService.list(1, 100).subscribe((result) => {
            this.licenceTypeNames.set(Object.fromEntries(result.items.map((t) => [t.id, t.name])));
        });
    }

    // Cambiar de organización invalida cualquier usuario/licencia ya elegidos (pertenecían a la
    // anterior) y recarga ambos catálogos filtrados por la nueva.
    onOrganizationChange(organizationId: string): void {
        this.form.controls.userId.setValue('');
        this.form.controls.assignedLicenseId.setValue('');
        this.users.set([]);
        this.licenses.set([]);

        if (!organizationId) {
            return;
        }

        if (this.form.controls.scope.value === 'individual') {
            this.loadUsers(organizationId);
        }
        this.loadLicenses(organizationId);
    }

    onScopeChange(scope: InvoiceScope): void {
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

        this.invoiceService
            .create({
                organizationId: value.organizationId,
                invoiceNumber: value.invoiceNumber,
                issueDate: this.toDateTimeString(value.issueDate),
                dueDate: this.toDateTimeString(value.dueDate),
                totalAmountValue: value.totalAmountValue,
                totalAmountCurrency: value.totalAmountCurrency,
                userId: isIndividual ? value.userId : null,
                assignedLicenseId: value.assignedLicenseId || null
            })
            .subscribe((result) => {
                this.saving.set(false);
                if (result.isSuccess) {
                    this.messageService.add({ severity: 'success', summary: 'Factura creada', detail: result.message });
                    this.router.navigate(['/invoices']);
                } else {
                    this.errorMessage.set(result.message);
                }
            });
    }

    cancel(): void {
        this.router.navigate(['/invoices']);
    }

    private loadUsers(organizationId: string): void {
        this.usersLoading.set(true);
        this.userService.list(1, 100, undefined, organizationId).subscribe((result) => {
            this.usersLoading.set(false);
            this.users.set(result.items);
        });
    }

    // AssignedLicensesController es exclusivo SUPERADMIN -- coherente, esta pantalla solo es
    // accesible para SUPERADMIN (único rol que puede crear facturas).
    private loadLicenses(organizationId: string): void {
        this.licensesLoading.set(true);
        this.assignedLicenseService.list(1, 100).subscribe((result) => {
            this.licensesLoading.set(false);
            this.licenses.set(result.items.filter((l) => l.organizationId === organizationId));
        });
    }

    private toDateTimeString(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;
    }
}
