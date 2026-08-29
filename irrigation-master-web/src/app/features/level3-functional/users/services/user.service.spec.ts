import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { AppUser, CreateUserRequest } from '../../../../shared/models/user.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { UserService } from './user.service';

const BASE_URL = `${environment.apiUrl}/v1/Users`;

const user: AppUser = {
    id: 'user-1',
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    organizationId: 'org-1',
    role: 'VECINO',
    isActive: true,
    fullName: 'Ana García',
    created: '2026-01-01',
    walkwayId: null,
    walkwayCode: null,
    organizationName: 'Comunidad de Regantes'
};

describe('UserService', () => {
    let service: UserService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(UserService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends PageNumber/PageSize plus the optional IsActive/OrganizationId filters', () => {
            let result: ListResult<AppUser> | undefined;

            service.list(1, 10, false, 'org-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('PageNumber')).toBe('1');
            expect(req.request.params.get('IsActive')).toBe('false');
            expect(req.request.params.get('OrganizationId')).toBe('org-1');
            req.flush({ data: [user], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [user], totalCount: 1 });
        });

        it('omits IsActive/OrganizationId from the query when not provided', () => {
            service.list().subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.has('IsActive')).toBe(false);
            expect(req.request.params.has('OrganizationId')).toBe(false);
            req.flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<AppUser> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<AppUser> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('getById()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<AppUser> | undefined;

            service.getById('user-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/user-1`).flush({ data: user, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: user });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: DetailResult<AppUser> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró el usuario.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el usuario.' });
        });
    });

    describe('create()', () => {
        const request: CreateUserRequest = { firstName: 'Luis', lastName: 'Pérez', email: 'luis@example.com', organizationId: 'org-1', roleId: 'role-1', password: 'Secret123!' };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-user-id', isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: 'new-user-id' });
        });

        it('on a 400 with backend validation errors, resolves with the real message', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'El correo ya está en uso.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'El correo ya está en uso.' });
        });
    });

    describe('update()', () => {
        it('PUTs to Update/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('user-1', { id: 'user-1', firstName: 'Ana', lastName: 'García', email: 'ana@example.com', organizationId: 'org-1' }).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/user-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });

    describe('delete()', () => {
        it('DELETEs to Delete/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.delete('user-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Delete/user-1`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });

    describe('activate()', () => {
        it('PUTs to Activate/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.activate('user-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Activate/user-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400 (e.g. insufficient permission), resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.activate('user-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Activate/user-1`).flush({ isSuccess: false, message: 'No tienes permiso para aprobar usuarios.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'No tienes permiso para aprobar usuarios.' });
        });
    });

    describe('deactivate()', () => {
        it('PUTs to Deactivate/{id}', () => {
            let result: OperationResult<boolean> | undefined;

            service.deactivate('user-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Deactivate/user-1`);
            expect(req.request.method).toBe('PUT');
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400 (e.g. insufficient permission), resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.deactivate('user-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Deactivate/user-1`).flush({ isSuccess: false, message: 'No tienes permiso para desactivar usuarios.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'No tienes permiso para desactivar usuarios.' });
        });
    });

    describe('changeRole()', () => {
        it('PUTs to ChangeRole/{id} with the roleId', () => {
            let result: OperationResult<boolean> | undefined;

            service.changeRole('user-1', 'role-2').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/ChangeRole/user-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual({ roleId: 'role-2' });
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });
    });

    describe('assignWalkway()', () => {
        it('PUTs to AssignWalkway/{id} with the walkwayId', () => {
            let result: OperationResult<boolean> | undefined;

            service.assignWalkway('user-1', 'walkway-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/AssignWalkway/user-1`);
            expect(req.request.body).toEqual({ walkwayId: 'walkway-1' });
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('sends null to unassign the walkway', () => {
            service.assignWalkway('user-1', null).subscribe();

            const req = httpMock.expectOne(`${BASE_URL}/AssignWalkway/user-1`);
            expect(req.request.body).toEqual({ walkwayId: null });
            req.flush({ data: true, isSuccess: true, message: 'ok' });
        });
    });

    describe('resetPassword()', () => {
        it('PUTs to ResetPassword/{id} with the new password', () => {
            let result: OperationResult<boolean> | undefined;

            service.resetPassword('user-1', 'NewSecret123!').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/ResetPassword/user-1`);
            expect(req.request.body).toEqual({ newPassword: 'NewSecret123!' });
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.resetPassword('missing', 'x').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/ResetPassword/missing`).flush({ isSuccess: false, message: 'No se encontró el usuario.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el usuario.' });
        });
    });
});
