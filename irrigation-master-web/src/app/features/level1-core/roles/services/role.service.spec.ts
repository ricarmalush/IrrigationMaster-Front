import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../../../environments/environment';
import { ListResult } from '../../../../shared/models/result.model';
import { Role } from '../../../../shared/models/role.model';
import { RoleService } from './role.service';

const PAGINATION_URL = `${environment.apiUrl}/v1/Roles/pagination`;

describe('RoleService', () => {
    let service: RoleService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()]
        });
        service = TestBed.inject(RoleService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('list(): sends PageNumber/PageSize and maps a successful page', () => {
        let result: ListResult<Role> | undefined;
        const roles: Role[] = [{ id: '1', name: 'Presidente', description: 'Gestiona la comunidad', code: 'PRESIDENTE', organizationId: 'org-1', isDeleted: false }];

        service.list(1, 50).subscribe((r) => (result = r));

        const req = httpMock.expectOne((r) => r.url === PAGINATION_URL);
        expect(req.request.method).toBe('GET');
        expect(req.request.params.get('PageNumber')).toBe('1');
        expect(req.request.params.get('PageSize')).toBe('50');
        req.flush({ data: roles, isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 1, totalCount: 1, pageSize: 50 });

        expect(result).toEqual({ isSuccess: true, message: 'ok', items: roles, totalCount: 1 });
    });

    it('list(): resolves an empty catalog as success with no items', () => {
        let result: ListResult<Role> | undefined;

        service.list().subscribe((r) => (result = r));

        httpMock.expectOne((r) => r.url === PAGINATION_URL).flush({ data: [], isSuccess: true, message: 'ok', pageNumber: 1, totalPages: 0, totalCount: 0, pageSize: 100 });

        expect(result).toEqual({ isSuccess: true, message: 'ok', items: [], totalCount: 0 });
    });

    it('list(): on a network failure, resolves with isSuccess:false instead of throwing', () => {
        let result: ListResult<Role> | undefined;

        service.list().subscribe((r) => (result = r));

        httpMock.expectOne((r) => r.url === PAGINATION_URL).error(new ProgressEvent('error'));

        expect(result?.isSuccess).toBe(false);
        expect(result?.items).toEqual([]);
    });
});
