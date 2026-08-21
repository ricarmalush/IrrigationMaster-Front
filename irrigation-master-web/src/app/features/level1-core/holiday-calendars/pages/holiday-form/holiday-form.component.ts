import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { CreateHolidayCalendarRequest, UpdateHolidayCalendarRequest } from '../../../../../shared/models/holiday-calendar.model';
import { HolidayCalendarService } from '../../services/holiday-calendar.service';

@Component({
    selector: 'app-holiday-form',
    standalone: true,
    imports: [ReactiveFormsModule, RouterModule, ButtonModule, InputTextModule, MessageModule, DatePickerModule, CheckboxModule],
    templateUrl: './holiday-form.component.html'
})
export class HolidayFormComponent implements OnInit {
    private fb = inject(FormBuilder);
    private holidayService = inject(HolidayCalendarService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private messageService = inject(MessageService);

    readonly isEditMode = signal(false);
    readonly loading = signal(false);
    readonly saving = signal(false);
    readonly errorMessage = signal<string | null>(null);

    private holidayId: string | null = null;

    readonly form = this.fb.nonNullable.group({
        date: [new Date(), Validators.required],
        description: ['', Validators.required],
        isNationalHoliday: [false]
    });

    ngOnInit(): void {
        this.holidayId = this.route.snapshot.paramMap.get('id');
        if (this.holidayId) {
            this.isEditMode.set(true);
            this.loadHoliday(this.holidayId);
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
        const date = this.toDateOnlyString(value.date);

        const onResult = (result: { isSuccess: boolean; message: string }) => {
            this.saving.set(false);
            if (result.isSuccess) {
                this.messageService.add({ severity: 'success', summary: this.isEditMode() ? 'Festivo actualizado' : 'Festivo creado', detail: result.message });
                this.router.navigate(['/system-settings/holidays']);
            } else {
                this.errorMessage.set(result.message);
            }
        };

        if (this.isEditMode()) {
            const request: UpdateHolidayCalendarRequest = { id: this.holidayId!, date, description: value.description, isNationalHoliday: value.isNationalHoliday };
            this.holidayService.update(this.holidayId!, request).subscribe(onResult);
        } else {
            const request: CreateHolidayCalendarRequest = { date, description: value.description, isNationalHoliday: value.isNationalHoliday };
            this.holidayService.create(request).subscribe(onResult);
        }
    }

    cancel(): void {
        this.router.navigate(['/system-settings/holidays']);
    }

    private loadHoliday(id: string): void {
        this.loading.set(true);
        this.holidayService.getById(id).subscribe((result) => {
            this.loading.set(false);
            if (result.isSuccess && result.data) {
                this.form.patchValue({
                    date: new Date(result.data.date),
                    description: result.data.description,
                    isNationalHoliday: result.data.isNationalHoliday
                });
            } else {
                this.errorMessage.set(result.message);
            }
        });
    }

    private toDateOnlyString(date: Date): string {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T00:00:00`;
    }
}
