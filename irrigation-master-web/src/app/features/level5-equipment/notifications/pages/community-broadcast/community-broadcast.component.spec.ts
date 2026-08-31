import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { AppUser } from '../../../../../shared/models/user.model';
import { DetailResult, OperationResult } from '../../../../../shared/models/result.model';
import { UserService } from '../../../../level3-functional/users/services/user.service';
import { NotificationService } from '../../services/notification.service';
import { CommunityBroadcastComponent } from './community-broadcast.component';

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ricardo',
    lastName: 'Ruiz',
    email: 'ricardo.ruiz@gmail.com',
    organizationId: 'org-1',
    role: 'PRESIDENTE',
    isActive: true,
    fullName: 'Ricardo Ruiz',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad'
};

describe('CommunityBroadcastComponent', () => {
    let component: CommunityBroadcastComponent;
    let fixture: ComponentFixture<CommunityBroadcastComponent>;
    let notificationService: jasmine.SpyObj<NotificationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let userService: jasmine.SpyObj<UserService>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(role: string | null): void {
        notificationService = jasmine.createSpyObj('NotificationService', ['send']);
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole', 'getUserId']);
        currentSession.getRole.and.returnValue(role);
        currentSession.getUserId.and.returnValue('user-1');
        userService = jasmine.createSpyObj('UserService', ['getById']);
        userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: user }));
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [CommunityBroadcastComponent],
            providers: [
                { provide: NotificationService, useValue: notificationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: UserService, useValue: userService },
                { provide: MessageService, useValue: messageService }
            ]
        });

        fixture = TestBed.createComponent(CommunityBroadcastComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes canEdit as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.canEdit).toBe(true);
    });

    it('exposes canEdit as true for PRESIDENTE', () => {
        setup('PRESIDENTE');
        expect(component.canEdit).toBe(true);
    });

    it('exposes canEdit as true for VICEPRESIDENTE', () => {
        setup('VICEPRESIDENTE');
        expect(component.canEdit).toBe(true);
    });

    // A diferencia de "Aprobar Turnos"/"Usuarios"/"Sectores", "Avisar a mi comunidad" SÍ incluye
    // a Coordinador de Riego -- espejo de ShowCommunityBroadcast en AdminMenuPage.xaml.cs de la
    // App; el backend solo exige el permiso SEND_NOTIFICATIONS, ya sembrado en ese rol.
    it('exposes canEdit as true for COORDINADOR_RIEGO', () => {
        setup('COORDINADOR_RIEGO');
        expect(component.canEdit).toBe(true);
    });

    it('exposes canEdit as false and disables the form for any other role', () => {
        setup('VECINO');

        expect(component.canEdit).toBe(false);
        expect(component.form.disabled).toBe(true);
    });

    describe('audience options (espejo de CommunityBroadcastViewModel.LoadAsync)', () => {
        it('starts with only "Toda mi organización" before the profile loads', () => {
            setup('PRESIDENTE');
            expect(component.audienceOptions()).toEqual([{ label: 'Toda mi organización', value: 'Organization' }]);
            expect(component.form.controls.audience.value).toBe('Organization');
        });

        it('does not fetch the profile when canEdit is false', () => {
            setup('VECINO');
            component.ngOnInit();
            expect(userService.getById).not.toHaveBeenCalled();
        });

        it('keeps only "Toda mi organización" when the current user has no walkway assigned', () => {
            setup('PRESIDENTE');
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: { ...user, walkwayId: null } }));

            component.ngOnInit();

            expect(component.audienceOptions()).toEqual([{ label: 'Toda mi organización', value: 'Organization' }]);
            expect(component.form.controls.audience.value).toBe('Organization');
        });

        it('adds "Mi andador" first and selects it by default when the current user has a walkway assigned', () => {
            setup('PRESIDENTE');
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: { ...user, walkwayId: 'walkway-1' } }));

            component.ngOnInit();

            expect(component.audienceOptions()).toEqual([
                { label: 'Mi andador', value: 'Walkway' },
                { label: 'Toda mi organización', value: 'Organization' }
            ]);
            expect(component.form.controls.audience.value).toBe('Walkway');
        });

        it('leaves the audience as Organization if the profile fetch fails', () => {
            setup('PRESIDENTE');
            userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: false, message: 'No se pudo cargar' }));

            component.ngOnInit();

            expect(component.audienceOptions()).toEqual([{ label: 'Toda mi organización', value: 'Organization' }]);
        });
    });

    it('does not submit an invalid (empty) form', () => {
        setup('SUPERADMIN');

        component.send();

        expect(notificationService.send).not.toHaveBeenCalled();
        expect(component.form.get('message')?.touched).toBe(true);
    });

    it('does not call the service when canEdit is false, even if send() is invoked directly', () => {
        setup('VECINO');

        component.send();

        expect(notificationService.send).not.toHaveBeenCalled();
    });

    it('on a valid form with audience Organization, sends the message, shows the recipient count and clears the form', () => {
        setup('PRESIDENTE');
        notificationService.send.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 15 }));
        component.form.controls.message.setValue('Corte de agua mañana');

        component.send();

        expect(notificationService.send).toHaveBeenCalledWith('Corte de agua mañana', 'Organization', undefined);
        expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success', detail: 'Enviado a 15 destinatarios.' }));
        expect(component.form.value.message).toBeFalsy();
    });

    // Regresión del bug reportado: patchValue() solo cambiaba el valor, dejando el control
    // "touched" (heredado del blur al pulsar "Enviar aviso"). El campo vacío sigue siendo
    // "invalid" por el required (eso es correcto, igual que un formulario recién cargado), pero
    // al quedar "untouched" el error deja de mostrarse -- la plantilla solo lo pinta cuando
    // invalid Y touched son ambos true.
    it('after a successful send, the message control is untouched (no false "required" error shown)', () => {
        setup('PRESIDENTE');
        notificationService.send.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 15 }));
        component.form.controls.message.setValue('Corte de agua mañana');
        component.form.controls.message.markAsTouched(); // simula el blur real al pulsar el botón

        component.send();

        expect(component.form.controls.message.touched).toBe(false);
        expect(component.form.controls.message.dirty).toBe(false);
        expect(component.form.controls.message.invalid).toBe(true); // vacío + required: correcto, igual que al cargar
    });

    it('on a valid form with audience Walkway, sends the message with the target walkway id', () => {
        setup('PRESIDENTE');
        userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: { ...user, walkwayId: 'walkway-1' } }));
        component.ngOnInit();
        notificationService.send.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 6 }));
        component.form.controls.message.setValue('Corte de agua en este andador');

        component.send();

        expect(notificationService.send).toHaveBeenCalledWith('Corte de agua en este andador', 'Walkway', 'walkway-1');
    });

    it('singularizes the recipient count message for exactly 1 recipient', () => {
        setup('SUPERADMIN');
        notificationService.send.and.returnValue(of<OperationResult<number>>({ isSuccess: true, message: 'ok', data: 1 }));
        component.form.controls.message.setValue('x');

        component.send();

        expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ detail: 'Enviado a 1 destinatario.' }));
    });

    it('on a 400 with a backend validation message, shows it and does not clear the form', () => {
        setup('SUPERADMIN');
        notificationService.send.and.returnValue(of<OperationResult<number>>({ isSuccess: false, message: 'El campo Message es obligatorio.' }));
        component.form.controls.message.setValue('x');

        component.send();

        expect(component.errorMessage()).toBe('El campo Message es obligatorio.');
        expect(component.form.value.message).toBe('x');
    });

    it('cancel() clears the message and any error message, keeping the selected audience', () => {
        setup('PRESIDENTE');
        userService.getById.and.returnValue(of<DetailResult<AppUser>>({ isSuccess: true, message: 'ok', data: { ...user, walkwayId: 'walkway-1' } }));
        component.ngOnInit();
        component.form.controls.message.setValue('algo');
        component.errorMessage.set('algún error previo');

        component.cancel();

        expect(component.form.value.message).toBeFalsy();
        expect(component.errorMessage()).toBeNull();
        expect(component.form.controls.audience.value).toBe('Walkway');
    });

    // Mismo bug/fix que en send(): cancel() también usaba patchValue(), con idéntico riesgo de
    // dejar el campo "touched" con el valor ya vacío.
    it('cancel() also leaves the message control untouched', () => {
        setup('PRESIDENTE');
        component.form.controls.message.setValue('algo');
        component.form.controls.message.markAsTouched();

        component.cancel();

        expect(component.form.controls.message.touched).toBe(false);
        expect(component.form.controls.message.dirty).toBe(false);
    });
});
