import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { CreateIrrigationTurnRequest, PendingApprovalTurn, WalkwayIrrigationStatus } from '../../../../shared/models/irrigation-turn.model';
import { DetailResult, OperationResult } from '../../../../shared/models/result.model';
import { IrrigationTurnService } from './irrigation-turn.service';

const BASE_URL = `${environment.apiUrl}/v1/IrrigationTurns`;

const turn: PendingApprovalTurn = {
    id: 'turn-1',
    requesterId: 'user-1',
    requesterFullName: 'Ricardo Ruiz',
    hydraulicSectorId: 'sector-1',
    scheduledStart: '2026-08-25T08:00:00Z',
    scheduledEnd: '2026-08-25T09:00:00Z'
};

const walkwayStatus: WalkwayIrrigationStatus = {
    walkwayId: 'walkway-1',
    walkwayCode: 'A-01',
    neighbors: [
        {
            userId: 'user-1',
            turnId: 'turn-1',
            fullName: 'Ricardo Ruiz',
            status: 'Waiting',
            scheduledStart: '2026-08-25T08:00:00Z',
            scheduledEnd: '2026-08-25T09:00:00Z',
            isApproved: false
        }
    ]
};

describe('IrrigationTurnService', () => {
    let service: IrrigationTurnService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        service = TestBed.inject(IrrigationTurnService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('listPendingApproval()', () => {
        it('maps a successful response', () => {
            let result: DetailResult<PendingApprovalTurn[]> | undefined;

            service.listPendingApproval().subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/pending-approval`);
            expect(req.request.method).toBe('GET');
            req.flush({ data: [turn], isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: [turn] });
        });

        it('resolves an empty list as success with no items', () => {
            let result: DetailResult<PendingApprovalTurn[]> | undefined;

            service.listPendingApproval().subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/pending-approval`).flush({ data: [], isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: [] });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: DetailResult<PendingApprovalTurn[]> | undefined;

            service.listPendingApproval().subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/pending-approval`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('approve()', () => {
        it('PATCHes to {id}/approve with a null body', () => {
            let result: OperationResult<string> | undefined;

            service.approve('turn-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/turn-1/approve`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: 'turn-1', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'turn-1' });
        });

        it('on a 400 with a real backend message (sin permiso), resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.approve('turn-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/turn-1/approve`).flush({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.approve('turn-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/turn-1/approve`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('getOrganizationStatus()', () => {
        it('GETs /status without a Date param when none is given', () => {
            let result: DetailResult<WalkwayIrrigationStatus[]> | undefined;

            service.getOrganizationStatus().subscribe((r) => (result = r));

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/status`);
            expect(req.request.params.has('Date')).toBe(false);
            req.flush({ data: [walkwayStatus], isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: [walkwayStatus] });
        });

        it('sends the Date param when given', () => {
            service.getOrganizationStatus('2026-08-25').subscribe();

            const req = httpMock.expectOne((r) => r.url === `${BASE_URL}/status`);
            expect(req.request.params.get('Date')).toBe('2026-08-25');
            req.flush({ data: [], isSuccess: true, message: 'ok' });
        });

        it('resolves an empty list as success with no items', () => {
            let result: DetailResult<WalkwayIrrigationStatus[]> | undefined;

            service.getOrganizationStatus().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/status`).flush({ data: [], isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: [] });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: DetailResult<WalkwayIrrigationStatus[]> | undefined;

            service.getOrganizationStatus().subscribe((r) => (result = r));

            httpMock.expectOne((r) => r.url === `${BASE_URL}/status`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('request()', () => {
        const request: CreateIrrigationTurnRequest = {
            startTime: '2026-08-25T08:00:00.000Z',
            endTime: '2026-08-25T10:00:00.000Z',
            hydraulicSectorId: 'sector-1',
            requesterId: 'user-1'
        };

        it('POSTs to Create and resolves the new turn id on success', () => {
            let result: OperationResult<string> | undefined;

            service.request(request).subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/Create`);
            expect(req.request.method).toBe('POST');
            expect(req.request.body).toEqual(request);
            req.flush({ data: 'new-turn-id', isSuccess: true, message: 'Operación completada exitosamente.' });

            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-turn-id' });
        });

        it('on a 400 with a real backend validation message, resolves with it instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.request(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).flush({ isSuccess: false, message: 'La fecha de inicio debe ser futura.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'La fecha de inicio debe ser futura.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<string> | undefined;

            service.request(request).subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/Create`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('start()', () => {
        it('PATCHes to {id}/start with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.start('turn-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/turn-1/start`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a 400 with a real backend message (fuera de tu andador), resolves with it instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.start('turn-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/turn-1/start`).flush({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' }, { status: 400, statusText: 'Bad Request' });

            expect(result).toEqual({ isSuccess: false, message: 'No tienes permiso para realizar esta acción.' });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.start('turn-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/turn-1/start`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });

    describe('complete()', () => {
        it('PATCHes to {id}/complete with a null body', () => {
            let result: OperationResult<boolean> | undefined;

            service.complete('turn-1').subscribe((r) => (result = r));

            const req = httpMock.expectOne(`${BASE_URL}/turn-1/complete`);
            expect(req.request.method).toBe('PATCH');
            expect(req.request.body).toBeNull();
            req.flush({ data: true, isSuccess: true, message: 'ok' });

            expect(result).toEqual({ isSuccess: true, message: 'ok', data: true });
        });

        it('on a network failure, resolves with isSuccess:false instead of throwing', () => {
            let result: OperationResult<boolean> | undefined;

            service.complete('turn-1').subscribe((r) => (result = r));

            httpMock.expectOne(`${BASE_URL}/turn-1/complete`).error(new ProgressEvent('error'));

            expect(result?.isSuccess).toBe(false);
        });
    });
});
