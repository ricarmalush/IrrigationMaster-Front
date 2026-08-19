import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { extractErrorMessage, toDetailResult, toListResult, toOperationResult } from './http-result.util';
import { NETWORK_ERROR_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../constants/service-messages';

describe('extractErrorMessage', () => {
    it('returns the backend message when the error body has one', () => {
        const error = new HttpErrorResponse({ status: 400, error: { message: 'El nombre ya está en uso.' } });
        expect(extractErrorMessage(error)).toBe('El nombre ya está en uso.');
    });

    it('falls back to the network message for a status-0 (unreachable server) error', () => {
        const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });
        expect(extractErrorMessage(error)).toBe(NETWORK_ERROR_MESSAGE);
    });

    it('falls back to the generic message for a non-network error with no backend message', () => {
        const error = new HttpErrorResponse({ status: 500, error: {} });
        expect(extractErrorMessage(error)).toBe(UNEXPECTED_ERROR_MESSAGE);
    });
});

describe('toOperationResult', () => {
    it('maps a successful response, carrying isSuccess/message/data through', (done) => {
        toOperationResult(of({ data: 'new-id', isSuccess: true, message: 'Operación completada exitosamente.' })).subscribe((result) => {
            expect(result).toEqual({ isSuccess: true, message: 'Operación completada exitosamente.', data: 'new-id' });
            done();
        });
    });

    it('on a 400 with backend validation errors, resolves (does not throw) with the backend message', (done) => {
        const error = new HttpErrorResponse({ status: 400, error: { message: 'El campo Name es obligatorio.' } });

        toOperationResult(throwError(() => error)).subscribe((result) => {
            expect(result).toEqual({ isSuccess: false, message: 'El campo Name es obligatorio.' });
            done();
        });
    });

    it('on a network failure, resolves with the network fallback message', (done) => {
        const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

        toOperationResult(throwError(() => error)).subscribe((result) => {
            expect(result).toEqual({ isSuccess: false, message: NETWORK_ERROR_MESSAGE });
            done();
        });
    });
});

describe('toDetailResult', () => {
    it('maps a successful response', (done) => {
        toDetailResult(of({ data: { id: '1' }, isSuccess: true, message: 'ok' })).subscribe((result) => {
            expect(result).toEqual({ isSuccess: true, message: 'ok', data: { id: '1' } });
            done();
        });
    });

    it('on a 404, resolves (does not throw) with the backend message and no data', (done) => {
        const error = new HttpErrorResponse({ status: 404, error: { message: 'No se encontró el recurso.' } });

        toDetailResult(throwError(() => error)).subscribe((result) => {
            expect(result).toEqual({ isSuccess: false, message: 'No se encontró el recurso.' });
            done();
        });
    });
});

describe('toListResult', () => {
    it('maps a successful paginated response', (done) => {
        toListResult(of({ data: [{ id: '1' }, { id: '2' }], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 2, pageSize: 10 })).subscribe((result) => {
            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [{ id: '1' }, { id: '2' }], totalCount: 2 });
            done();
        });
    });

    it('treats an empty page as a success with an empty items array', (done) => {
        toListResult(of({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 10 })).subscribe((result) => {
            expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
            done();
        });
    });

    it('on a network failure, resolves with an empty list and the network fallback message', (done) => {
        const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

        toListResult(throwError(() => error)).subscribe((result) => {
            expect(result).toEqual({ isSuccess: false, message: NETWORK_ERROR_MESSAGE, items: [], totalCount: 0 });
            done();
        });
    });
});
