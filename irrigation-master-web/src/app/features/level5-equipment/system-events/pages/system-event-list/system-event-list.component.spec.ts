import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { SystemEvent } from '../../../../../shared/models/system-event.model';
import { SystemEventService } from '../../services/system-event.service';
import { SystemEventListComponent } from './system-event-list.component';

const anomalyEvent: SystemEvent = {
    id: 'event-1',
    occurredAt: '2026-09-26T02:00:00Z',
    eventType: 'AnomalyDetected',
    description: 'Cadena de huellas rota en la factura INV-2026-09-000003.',
    triggeredBy: 'System'
};

describe('SystemEventListComponent', () => {
    let component: SystemEventListComponent;
    let fixture: ComponentFixture<SystemEventListComponent>;
    let systemEventService: jasmine.SpyObj<SystemEventService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(role: string | null): void {
        systemEventService = jasmine.createSpyObj('SystemEventService', ['list', 'downloadReport']);
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [SystemEventListComponent],
            providers: [
                { provide: SystemEventService, useValue: systemEventService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(SystemEventListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    describe('typeLabel() / typeSeverity()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('translates AnomalyDetected to a danger tag in Spanish', () => {
            expect(component.typeLabel(anomalyEvent)).toBe('Anomalía detectada');
            expect(component.typeSeverity(anomalyEvent)).toBe('danger');
        });
    });

    describe('onLazyLoad()', () => {
        it('does nothing if the caller is not SUPERADMIN', () => {
            setup('PRESIDENTE');

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(systemEventService.list).not.toHaveBeenCalled();
        });

        it('loads a page and exposes the items/total on success', () => {
            setup('SUPERADMIN');
            systemEventService.list.and.returnValue(of<ListResult<SystemEvent>>({ isSuccess: true, message: 'ok', items: [anomalyEvent], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(systemEventService.list).toHaveBeenCalledWith(1, 10);
            expect(component.events()).toEqual([anomalyEvent]);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message on failure', () => {
            setup('SUPERADMIN');
            systemEventService.list.and.returnValue(of<ListResult<SystemEvent>>({ isSuccess: false, message: 'No autorizado.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No autorizado.');
        });
    });

    describe('downloadReport()', () => {
        it('does nothing if the caller is not SUPERADMIN', () => {
            setup('PRESIDENTE');

            component.downloadReport();

            expect(systemEventService.downloadReport).not.toHaveBeenCalled();
        });

        it('on success, downloads the PDF and clears the loading flag', () => {
            setup('SUPERADMIN');
            const blob = new Blob(['%PDF-fake'], { type: 'application/pdf' });
            systemEventService.downloadReport.and.returnValue(of<OperationResult<Blob>>({ isSuccess: true, message: '', data: blob }));
            spyOn(URL, 'createObjectURL').and.returnValue('blob:fake-url');
            spyOn(URL, 'revokeObjectURL');

            component.downloadReport();

            expect(systemEventService.downloadReport).toHaveBeenCalled();
            expect(component.downloadingReport()).toBe(false);
            expect(messageService.add).not.toHaveBeenCalled();
        });

        it('on failure, shows an error toast instead of downloading', () => {
            setup('SUPERADMIN');
            systemEventService.downloadReport.and.returnValue(of<OperationResult<Blob>>({ isSuccess: false, message: 'No se pudo generar el informe.' }));

            component.downloadReport();

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo generar el informe.' }));
        });
    });
});
