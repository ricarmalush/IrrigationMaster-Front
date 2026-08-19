import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { Walkway } from '../../../../../shared/models/walkway.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { WalkwayService } from '../../services/walkway.service';
import { WalkwayListComponent } from './walkway-list.component';

const walkway: Walkway = { id: 'walkway-1', code: 'A-01', length: 120, hydraulicSectorId: 'sector-1', organizationId: 'org-1', isActive: true, created: '2026-01-01' };

describe('WalkwayListComponent', () => {
    let component: WalkwayListComponent;
    let fixture: ComponentFixture<WalkwayListComponent>;
    let walkwayService: jasmine.SpyObj<WalkwayService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    beforeEach(() => {
        walkwayService = jasmine.createSpyObj('WalkwayService', ['list', 'delete']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [WalkwayListComponent],
            providers: [
                provideRouter([]),
                { provide: WalkwayService, useValue: walkwayService },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(WalkwayListComponent);
        component = fixture.componentInstance;
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    describe('onLazyLoad()', () => {
        it('loads a page and exposes the items/total on success', () => {
            walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: true, message: 'ok', items: [walkway], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(walkwayService.list).toHaveBeenCalledWith(1, 10);
            expect(component.walkways()).toEqual([walkway]);
            expect(component.totalRecords()).toBe(1);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.walkways()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message on failure', () => {
            walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    describe('confirmDelete()', () => {
        it('asks for confirmation, and on accept deletes + reloads the list', () => {
            walkwayService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Eliminada' }));
            walkwayService.list.and.returnValue(of<ListResult<Walkway>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(walkway);

            expect(walkwayService.delete).toHaveBeenCalledWith('walkway-1');
            expect(walkwayService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when the delete fails', () => {
            walkwayService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo eliminar.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(walkway);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error' }));
            expect(walkwayService.list).not.toHaveBeenCalled();
        });
    });
});
