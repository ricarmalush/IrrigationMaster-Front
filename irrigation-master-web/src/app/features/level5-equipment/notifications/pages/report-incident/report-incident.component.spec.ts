import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { OperationResult } from '../../../../../shared/models/result.model';
import { NotificationService } from '../../services/notification.service';
import { ReportIncidentComponent } from './report-incident.component';

describe('ReportIncidentComponent', () => {
    let component: ReportIncidentComponent;
    let fixture: ComponentFixture<ReportIncidentComponent>;
    let notificationService: jasmine.SpyObj<NotificationService>;
    let messageService: jasmine.SpyObj<MessageService>;

    beforeEach(() => {
        notificationService = jasmine.createSpyObj('NotificationService', ['reportIncident']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [ReportIncidentComponent],
            providers: [
                { provide: NotificationService, useValue: notificationService },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(ReportIncidentComponent);
        component = fixture.componentInstance;
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('does not submit an invalid (empty) form', () => {
        component.send();

        expect(notificationService.reportIncident).not.toHaveBeenCalled();
        expect(component.form.get('message')?.touched).toBe(true);
    });

    it('on a valid form, sends the message, shows the recipient count and clears the form', () => {
        notificationService.reportIncident.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 3 }));
        component.form.setValue({ message: 'Fuga en la válvula 3' });

        component.send();

        expect(notificationService.reportIncident).toHaveBeenCalledWith('Fuga en la válvula 3');
        expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Enviada a 3 destinatarios.' }));
        expect(component.form.value.message).toBeFalsy();
    });

    it('singularizes the recipient count message for exactly 1 recipient', () => {
        notificationService.reportIncident.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 1 }));
        component.form.setValue({ message: 'x' });

        component.send();

        expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'Enviada a 1 destinatario.' }));
    });

    it('on a 400 with a backend validation message, shows it and does not clear the form', () => {
        notificationService.reportIncident.and.returnValue(of<OperationResult<number>>({ isSuccess: false, message: 'El campo Message es obligatorio.' }));
        component.form.setValue({ message: 'x' });

        component.send();

        expect(component.errorMessage()).toBe('El campo Message es obligatorio.');
        expect(component.form.value.message).toBe('x');
    });

    it('sets sending() while the request is in flight and clears it afterwards', () => {
        notificationService.reportIncident.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 0 }));
        component.form.setValue({ message: 'x' });

        component.send();

        expect(component.sending()).toBe(false);
    });

    it('cancel() clears the form and any error message', () => {
        component.form.setValue({ message: 'algo' });
        component.errorMessage.set('algún error previo');

        component.cancel();

        expect(component.form.value.message).toBeFalsy();
        expect(component.errorMessage()).toBeNull();
    });
});
