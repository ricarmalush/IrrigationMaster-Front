import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import Swal from 'sweetalert2';

import { AuthService, LoginResult } from '../../../services/auth';
import { Login } from './login';

describe('Login', () => {
    let component: Login;
    let fixture: ComponentFixture<Login>;
    let authService: jasmine.SpyObj<AuthService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(() => {
        authService = jasmine.createSpyObj('AuthService', ['login']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true, isDenied: false, isDismissed: false });

        TestBed.configureTestingModule({
            imports: [Login],
            providers: [
                { provide: AuthService, useValue: authService },
                { provide: Router, useValue: router }
            ]
        });

        fixture = TestBed.createComponent(Login);
        component = fixture.componentInstance;
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('iniciarSesion() shows a warning and does not call the service when email/password are empty', () => {
        component.email = '';
        component.password = '';

        component.iniciarSesion();

        expect(authService.login).not.toHaveBeenCalled();
        expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'warning', title: 'Campos Incompletos' }));
    });

    it('on success, navigates to the dashboard without showing any alert', () => {
        component.email = 'admin@irrigationmaster.com';
        component.password = 'Admin123!';
        authService.login.and.returnValue(of<LoginResult>({ isSuccess: true, message: 'ok' }));

        component.iniciarSesion();

        expect(router.navigate).toHaveBeenCalledWith(['/']);
        expect(Swal.fire).not.toHaveBeenCalled();
    });

    it('on a plain login failure (bad credentials), shows the generic authentication error with the real backend message', () => {
        component.email = 'admin@irrigationmaster.com';
        component.password = 'wrong';
        authService.login.and.returnValue(of<LoginResult>({ isSuccess: false, message: 'El correo electrónico o la contraseña son incorrectos.' }));

        component.iniciarSesion();

        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({ title: 'Error de Autenticación', text: 'El correo electrónico o la contraseña son incorrectos.', icon: 'error' })
        );
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('on a 402 (isLicenceError:true), shows a distinct "Licencia no disponible" warning with the real backend message', () => {
        component.email = 'vecino@irrigationmaster.com';
        component.password = 'Vecino123!';
        authService.login.and.returnValue(
            of<LoginResult>({
                isSuccess: false,
                message: 'Tu organización no dispone de una licencia activa, y no tienes una licencia individual propia. Contacta con soporte.',
                isLicenceError: true
            })
        );

        component.iniciarSesion();

        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({
                title: 'Licencia no disponible',
                text: 'Tu organización no dispone de una licencia activa, y no tienes una licencia individual propia. Contacta con soporte.',
                icon: 'warning'
            })
        );
        expect(router.navigate).not.toHaveBeenCalled();
    });

    it('on a 403 (isAccountDeactivatedError:true), shows a distinct "Cuenta desactivada" warning with the real backend message', () => {
        component.email = 'vecino@irrigationmaster.com';
        component.password = 'Vecino123!';
        authService.login.and.returnValue(
            of<LoginResult>({
                isSuccess: false,
                message: 'Tu cuenta ha sido desactivada por un administrador. Contacta con tu organización.',
                isAccountDeactivatedError: true
            })
        );

        component.iniciarSesion();

        expect(Swal.fire).toHaveBeenCalledWith(
            jasmine.objectContaining({
                title: 'Cuenta desactivada',
                text: 'Tu cuenta ha sido desactivada por un administrador. Contacta con tu organización.',
                icon: 'warning'
            })
        );
        expect(router.navigate).not.toHaveBeenCalled();
    });
});
