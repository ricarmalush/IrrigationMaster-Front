import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { HolidayCalendar } from '../../../../../shared/models/holiday-calendar.model';
import { DetailResult, OperationResult } from '../../../../../shared/models/result.model';
import { HolidayCalendarService } from '../../services/holiday-calendar.service';
import { HolidayFormComponent } from './holiday-form.component';

const holiday: HolidayCalendar = {
    id: 'holiday-1',
    date: '2026-12-25T00:00:00',
    description: 'Navidad',
    isNationalHoliday: true,
    organizationId: 'org-1',
    created: '2026-01-01'
};

describe('HolidayFormComponent', () => {
    let component: HolidayFormComponent;
    let fixture: ComponentFixture<HolidayFormComponent>;
    let holidayService: jasmine.SpyObj<HolidayCalendarService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null): void {
        holidayService = jasmine.createSpyObj('HolidayCalendarService', ['getById', 'create', 'update']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [HolidayFormComponent],
            providers: [
                { provide: HolidayCalendarService, useValue: holidayService },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(HolidayFormComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    describe('create mode', () => {
        beforeEach(() => setup(null));

        it('does not submit an invalid (empty description) form', () => {
            component.form.patchValue({ description: '' });

            component.save();

            expect(holidayService.create).not.toHaveBeenCalled();
            expect(component.form.controls.description.touched).toBe(true);
        });

        it('on a valid form, creates the holiday with a date-only ISO string and navigates back to the list', () => {
            holidayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({ date: new Date(2026, 11, 25), description: 'Navidad', isNationalHoliday: true });

            component.save();

            expect(holidayService.create).toHaveBeenCalledWith({ date: '2026-12-25T00:00:00', description: 'Navidad', isNationalHoliday: true });
            expect(router.navigate).toHaveBeenCalledWith(['/system-settings/holidays']);
        });

        it('on a 400 with a backend validation message, shows it and does not navigate', () => {
            holidayService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'La descripción es obligatoria.' }));
            component.form.setValue({ date: new Date(2026, 11, 25), description: 'x', isNationalHoliday: false });

            component.save();

            expect(component.errorMessage()).toBe('La descripción es obligatoria.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode', () => {
        it('loads the holiday and patches the form', () => {
            setup('holiday-1');
            holidayService.getById.and.returnValue(of<DetailResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', data: holiday }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(component.form.getRawValue().description).toBe('Navidad');
            expect(component.form.getRawValue().isNationalHoliday).toBe(true);
        });

        it('on save, calls update() with the id', () => {
            setup('holiday-1');
            holidayService.getById.and.returnValue(of<DetailResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', data: holiday }));
            holidayService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(holidayService.update).toHaveBeenCalledWith('holiday-1', { id: 'holiday-1', date: '2026-12-25T00:00:00', description: 'Navidad', isNationalHoliday: true });
        });

        it('on getById failure, surfaces the error message', () => {
            setup('holiday-1');
            holidayService.getById.and.returnValue(of<DetailResult<HolidayCalendar>>({ isSuccess: false, message: 'No se encontró el festivo.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se encontró el festivo.');
        });
    });
});
