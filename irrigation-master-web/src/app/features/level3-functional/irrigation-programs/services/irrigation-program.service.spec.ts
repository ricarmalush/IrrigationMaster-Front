import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CurrentSessionService } from '../../../../core/services/current-session';
import { CreateIrrigationProgramRequest, IrrigationProgram, UpdateIrrigationProgramRequest } from '../../../../shared/models/irrigation-program.model';
import { DetailResult, ListResult, OperationResult } from '../../../../shared/models/result.model';
import { IrrigationProgramService } from './irrigation-program.service';

const BASE_URL = `${environment.apiUrl}/v1/IrrigationPrograms`;
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function base64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function buildToken(organizationId: string): string {
    const payload = { sub: 'user-1', organizationId, [ROLE_CLAIM]: 'SUPERADMIN' };
    return `header.${base64Url(JSON.stringify(payload))}.signature`;
}

const program: IrrigationProgram = {
    id: 'program-1',
    name: 'Riego matutino Sector Norte',
    startTime: '06:00:00',
    durationMinutes: 90,
    daysOfWeek: '1,3,5',
    isActive: true,
    organizationId: 'org-1',
    hydraulicSectorId: 'sector-1',
    created: '2026-01-01',
    seasonStartMonth: null,
    seasonStartDay: null,
    seasonEndMonth: null,
    seasonEndDay: null
};

describe('IrrigationProgramService', () => {
    let service: IrrigationProgramService;
    let httpMock: HttpTestingController;
    let currentSession: CurrentSessionService;

    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(IrrigationProgramService);
        httpMock = TestBed.inject(HttpTestingController);
        currentSession = TestBed.inject(CurrentSessionService);
        currentSession.establish(buildToken('org-1'));
    });

    afterEach(() => {
        httpMock.verify();
        localStorage.clear();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('list()', () => {
        it('sends OrganizationId/PageNumber/PageSize and maps a successful page', () => {
            let result: ListResult<IrrigationProgram> | undefined;

            service.list(1, 10).subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`);
            expect(req.request.params.get('OrganizationId')).toBe('org-1');
            expect(req.request.params.get('PageNumber')).toBe('1');
            req.flush({ data: [program], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [program], totalCount: 1 });
        });

        it('resolves an empty page as success with no items', () => {
            let result: ListResult<IrrigationProgram> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 });

            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: ListResult<IrrigationProgram> | undefined;

            service.list().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/pagination`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('getById()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<IrrigationProgram> | undefined;

            service.getById('program-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/program-1`).flush({ data: program, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: program });
        });

        it('on a 404, resolves with the backend message', () => {
            let result: DetailResult<IrrigationProgram> | undefined;

            service.getById('missing').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Get/missing`).flush({ isSuccess: false, message: 'No se encontró el programa de riego.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el programa de riego.' });
        });
    });

    describe('create()', () => {
        const request: CreateIrrigationProgramRequest = {
            name: 'Riego tarde Sector Sur',
            startTime: '18:00:00',
            durationMinutes: 45,
            daysOfWeek: '2,4,6',
            hydraulicSectorId: 'sector-2'
        };

        it('POSTs to Create and resolves the new id on success', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-program-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-program-id' });
        });

        it('on a 400 with a real backend validation message (temporada incompleta), resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create({ ...request, seasonStartMonth: 6 }).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'La temporada debe especificarse completa o no especificarse.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La temporada debe especificarse completa o no especificarse.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.create(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('update()', () => {
        const request: UpdateIrrigationProgramRequest = {
            id: 'program-1',
            name: 'Riego matutino (editado)',
            startTime: '06:30:00',
            durationMinutes: 60,
            daysOfWeek: '1,2,3,4,5',
            isActive: false
        };

        it('PUTs to Update/{id} without a hydraulicSectorId in the body', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('program-1', request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Update/program-1`);
            expect(req.request.method).toBe('PUT');
            expect(req.request.body).toEqual(request);
            expect(req.request.body.hydraulicSectorId).toBeUndefined();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.update('program-1', request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Update/program-1`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('isIrrigationDay()', () => {
        it('sends HydraulicSectorId without a Date param when none is given', () => {
            let result: OperationResult<boolean> | undefined;

            service.isIrrigationDay('sector-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/IsIrrigationDay`);
            expect(req.request.params.get('HydraulicSectorId')).toBe('sector-1');
            expect(req.request.params.has('Date')).toBe(false);
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('sends the Date param when given', () => {
            service.isIrrigationDay('sector-1', '2026-08-25').subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/IsIrrigationDay`);
            expect(req.request.params.get('Date')).toBe('2026-08-25');
            req.flush({ data: false, isSuccess: true, message: 'ok' });
        });

        it('on a 404 (sector inexistente), resolves with the backend message', () => {
            let result: OperationResult<boolean> | undefined;

            service.isIrrigationDay('missing-sector').subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/IsIrrigationDay`).flush({ isSuccess: false, message: 'No se encontró el sector hidráulico.' }, { status: 404, statusText: 'Not Found' });

            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el sector hidráulico.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.isIrrigationDay('sector-1').subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/IsIrrigationDay`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
