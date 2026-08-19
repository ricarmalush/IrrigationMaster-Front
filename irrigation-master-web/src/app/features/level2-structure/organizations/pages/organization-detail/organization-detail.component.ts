import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { SelectModule } from 'primeng/select';
import { CountryService } from '../../../../level1-core/countries/services/country.service';
import { Country } from '../../../../../shared/models/country.model';
import { OrganizationService } from '../../services/organization.service';

@Component({
    selector: 'app-organization-detail',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, SelectModule, MessageModule],
    templateUrl: './organization-detail.component.html'
})
export class OrganizationDetailComponent implements OnInit {
    private fb = inject(FormBuilder);
    private organizationService = inject(OrganizationService);
    private countryService = inject(CountryService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);
    readonly countries = signal<Country[]>([]);
    readonly countriesLoading = signal(false);

    private organizationId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        name: ['', Validators.required],
        taxId: ['', Validators.required],
        address: this.fb.nonNullable.group({
            mainAddress: ['', Validators.required],
            city: ['', Validators.required],
            stateOrProvince: ['', Validators.required],
            postalCode: ['', Validators.required],
            countryId: ['', Validators.required],
            locationDetail: ['']
        })
    });

    ngOnInit(): void {
        this.loadCountries();

        this.organizationId = this.route.snapshot.paramMap.get('id');
        if (this.organizationId) {
            this.isEditMode.set(true);
            this.loadOrganization(this.organizationId);
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
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Organización actualizada' : 'Organización creada', detail: result.message });
                this.router.navigate(['/organizations']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            this.organizationService.update(this.organizationId!, { id: this.organizationId!, ...value }).subscribe(onResult);
        } else {
            this.organizationService.create(value).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/organizations']);
    }

    private loadCountries(): void {
        this.countriesLoading.set(true);
        this.countryService.list(1, 200).subscribe((result) => {
            this.countriesLoading.set(false);
            this.countries.set(result.items);
        });
    }

    private loadOrganization(id: string): void {
        this.loading.set(true);
        this.organizationService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue(result.data);
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }
}
