import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { HolidayCalendar } from '../../../../../shared/models/holiday-calendar.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HolidayCalendarService } from '../../services/holiday-calendar.service';
import { CalendarManagementComponent } from './calendar-management.component';

const holiday: HolidayCalendar = {
    id: 'holiday-1',
    date: '2026-12-25T00:00:00',
    description: 'Navidad',
    isNationalHoliday: true,
    organizationId: 'org-1',
    created: '2026-01-01'
};

describe('CalendarManagementComponent', () => {
    let component: CalendarManagementComponent;
    let fixture: ComponentFixture<CalendarManagementComponent>;
    let holidayService: jasmine.SpyObj<HolidayCalendarService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    function setup(): void {
        holidayService = jasmine.createSpyObj('HolidayCalendarService', ['list', 'delete']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [CalendarManagementComponent],
            providers: [
                provideRouter([]),
                { provide: HolidayCalendarService, useValue: holidayService },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(CalendarManagementComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup();
        expect(component).toBeTruthy();
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup());

        it('loads a page and exposes the items/total on success', () => {
            holidayService.list.and.returnValue(of<ListResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', items: [holiday], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(holidayService.list).toHaveBeenCalledWith(1, 10);
            expect(component.holidays()).toEqual([holiday]);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('computes the correct page number from a non-zero "first"', () => {
            holidayService.list.and.returnValue(of<ListResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 20, rows: 10 });

            expect(holidayService.list).toHaveBeenCalledWith(3, 10);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            holidayService.list.and.returnValue(of<ListResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.holidays()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            holidayService.list.and.returnValue(of<ListResult<HolidayCalendar>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.holidays()).toEqual([]);
        });
    });

    describe('confirmDelete()', () => {
        beforeEach(() => setup());

        it('asks for confirmation, and on accept deletes + reloads the list', () => {
            holidayService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Eliminado' }));
            holidayService.list.and.returnValue(of<ListResult<HolidayCalendar>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(holiday);

            expect(holidayService.delete).toHaveBeenCalledWith('holiday-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(holidayService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when the delete fails', () => {
            holidayService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo eliminar.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(holiday);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo eliminar.' }));
            expect(holidayService.list).not.toHaveBeenCalled();
        });
    });
});
