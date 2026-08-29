import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { AuthService, LoginResult, NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from './auth';
import { CurrentSessionService } from './current-session';
import { environment } from '../../../environments/environment';

const LOGIN_URL = `${environment.apiUrl}/v1/Auth/Login`;
const BACKEND_INVALID_CREDENTIALS_MESSAGE = 'El correo electrónico o la contraseña son incorrectos.';
const BACKEND_SUCCESS_MESSAGE = 'Operación completada exitosamente.';
const BACKEND_NO_ACTIVE_LICENCE_MESSAGE = 'Tu organización no dispone de una licencia activa, y no tienes una licencia individual propia. Contacta con soporte.';
const BACKEND_ACCOUNT_DEACTIVATED_MESSAGE = 'Tu cuenta ha sido desactivada por un administrador. Contacta con tu organización.';

describe('AuthService', () => {
    let service: AuthService;
    let httpMock: HttpTestingController;
    let currentSession: CurrentSessionService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
        });

        service = TestBed.inject(AuthService);
        httpMock = TestBed.inject(HttpTestingController);
        currentSession = TestBed.inject(CurrentSessionService);

        spyOn(currentSession, 'establish');
        spyOn(currentSession, 'clear');
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('login(): on success, resolves isSuccess + the real backend message, stores the token and establishes the session', () => {
        const token = 'header.payload.signature';
        let result: LoginResult | undefined;

        service.login('user@example.com', 'secret').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual({ email: 'user@example.com', password: 'secret' });
        req.flush({ data: token, isSuccess: true, message: BACKEND_SUCCESS_MESSAGE });

        expect(result).toEqual({ isSuccess: true, message: BACKEND_SUCCESS_MESSAGE });
        expect(localStorage.getItem('jwt_token')).toBe(token);
        expect(currentSession.establish).toHaveBeenCalledWith(token);
    });

    it('login(): on a 401 with a backend message (bad credentials), surfaces that exact message', () => {
        let result: LoginResult | undefined;

        service.login('user@example.com', 'wrong').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        req.flush({ isSuccess: false, message: BACKEND_INVALID_CREDENTIALS_MESSAGE }, { status: 401, statusText: 'Unauthorized' });

        expect(result).toEqual({ isSuccess: false, message: BACKEND_INVALID_CREDENTIALS_MESSAGE, isLicenceError: false, isAccountDeactivatedError: false });
        expect(localStorage.getItem('jwt_token')).toBeNull();
        expect(currentSession.establish).not.toHaveBeenCalled();
    });

    it('login(): on a 402 (sin licencia activa, ni de organización ni individual), surfaces the real message with isLicenceError:true', () => {
        let result: LoginResult | undefined;

        service.login('user@example.com', 'secret').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        req.flush({ isSuccess: false, message: BACKEND_NO_ACTIVE_LICENCE_MESSAGE }, { status: 402, statusText: 'Payment Required' });

        expect(result).toEqual({ isSuccess: false, message: BACKEND_NO_ACTIVE_LICENCE_MESSAGE, isLicenceError: true, isAccountDeactivatedError: false });
        expect(currentSession.establish).not.toHaveBeenCalled();
    });

    it('login(): on a 403 (cuenta desactivada por un administrador), surfaces the real message with isAccountDeactivatedError:true', () => {
        let result: LoginResult | undefined;

        service.login('user@example.com', 'secret').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        req.flush({ isSuccess: false, message: BACKEND_ACCOUNT_DEACTIVATED_MESSAGE }, { status: 403, statusText: 'Forbidden' });

        expect(result).toEqual({ isSuccess: false, message: BACKEND_ACCOUNT_DEACTIVATED_MESSAGE, isLicenceError: false, isAccountDeactivatedError: true });
        expect(currentSession.establish).not.toHaveBeenCalled();
    });

    it('login(): on an error response with no message body, falls back to the generic error message', () => {
        let result: LoginResult | undefined;

        service.login('user@example.com', 'secret').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        req.flush({}, { status: 500, statusText: 'Internal Server Error' });

        expect(result).toEqual({ isSuccess: false, message: UNEXPECTED_ERROR_MESSAGE, isLicenceError: false, isAccountDeactivatedError: false });
    });

    it('login(): on a network-level failure (no response reached), falls back to the network error message', () => {
        let result: LoginResult | undefined;

        service.login('user@example.com', 'secret').subscribe((r) => (result = r));

        const req = httpMock.expectOne(LOGIN_URL);
        req.error(new ProgressEvent('error'));

        expect(result).toEqual({ isSuccess: false, message: NETWORK_ERROR_MESSAGE, isLicenceError: false, isAccountDeactivatedError: false });
        expect(currentSession.establish).not.toHaveBeenCalled();
    });

    it('getToken()/logout(): logout clears the stored token and the session', () => {
        localStorage.setItem('jwt_token', 'some-token');

        expect(service.getToken()).toBe('some-token');

        service.logout();

        expect(service.getToken()).toBeNull();
        expect(currentSession.clear).toHaveBeenCalled();
    });
});
