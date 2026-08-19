import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { HydraulicSector } from '../../../../../shared/models/hydraulic-sector.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { HydraulicSectorService } from '../../services/hydraulic-sector.service';
import { SectorListComponent } from './sector-list.component';

const sector: HydraulicSector = { id: 'sector-1', name: 'Sector Norte', areaSize: 12.5, organizationId: 'org-1', isDeleted: false };

describe('SectorListComponent', () => {
    let component: SectorListComponent;
    let fixture: ComponentFixture<SectorListComponent>;
    let sectorService: jasmine.SpyObj<HydraulicSectorService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    beforeEach(() => {
        sectorService = jasmine.createSpyObj('HydraulicSectorService', ['list', 'delete']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [SectorListComponent],
            providers: [
                provideRouter([]),
                { provide: HydraulicSectorService, useValue: sectorService },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(SectorListComponent);
        component = fixture.componentInstance;
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    describe('onLazyLoad()', () => {
        it('loads a page and exposes the items/total on success', () => {
            sectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: true, message: 'ok', items: [sector], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(sectorService.list).toHaveBeenCalledWith(1, 10);
            expect(component.sectors()).toEqual([sector]);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('shows an empty table (no error) when the page has no items', () => {
            sectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.sectors()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            sectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    describe('confirmDelete()', () => {
        it('asks for confirmation, and on accept deletes + reloads the list', () => {
            sectorService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Eliminado' }));
            sectorService.list.and.returnValue(of<ListResult<HydraulicSector>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(sector);

            expect(sectorService.delete).toHaveBeenCalledWith('sector-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(sectorService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when the delete fails', () => {
            sectorService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo eliminar.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(sector);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo eliminar.' }));
            expect(sectorService.list).not.toHaveBeenCalled();
        });
    });
});
