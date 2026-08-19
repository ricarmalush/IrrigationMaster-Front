import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { Organization } from '../../../../../shared/models/organization.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { OrganizationService } from '../../services/organization.service';
import { OrganizationListComponent } from './organization-list.component';

const organization: Organization = {
    id: 'org-1',
    name: 'Comunidad de Regantes',
    taxId: 'B123',
    address: { mainAddress: 'x', city: 'Sevilla', stateOrProvince: 'SE', postalCode: '41001', countryId: 'c1' },
    isActive: true,
    created: '2026-01-01',
    createdBy: 'system',
    invitationCode: 'ABC'
};

describe('OrganizationListComponent', () => {
    let component: OrganizationListComponent;
    let fixture: ComponentFixture<OrganizationListComponent>;
    let organizationService: jasmine.SpyObj<OrganizationService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    function setup(role: string | null): void {
        organizationService = jasmine.createSpyObj('OrganizationService', ['list', 'delete', 'restore']);
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [OrganizationListComponent],
            providers: [
                provideRouter([]),
                { provide: OrganizationService, useValue: organizationService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(OrganizationListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes isSuperAdmin as false for a non-SUPERADMIN role', () => {
        setup('VECINO');
        expect(component.isSuperAdmin).toBe(false);
    });

    it('exposes isSuperAdmin as true for the SUPERADMIN role', () => {
        setup('SUPERADMIN');
        expect(component.isSuperAdmin).toBe(true);
    });

    describe('onLazyLoad()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('loads a page and exposes the items/total on success', () => {
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [organization], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(organizationService.list).toHaveBeenCalledWith(1, 10);
            expect(component.organizations()).toEqual([organization]);
            expect(component.totalRecords()).toBe(1);
            expect(component.errorMessage()).toBeNull();
        });

        it('computes the correct page number from a non-zero "first"', () => {
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 20, rows: 10 });

            expect(organizationService.list).toHaveBeenCalledWith(3, 10);
        });

        it('shows an empty table (no error) when the page has no items', () => {
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.organizations()).toEqual([]);
            expect(component.errorMessage()).toBeNull();
        });

        it('surfaces the backend/network error message and clears the table on failure', () => {
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
            expect(component.organizations()).toEqual([]);
        });
    });

    describe('confirmDelete()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('asks for confirmation, and on accept deletes + reloads the list', () => {
            organizationService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Eliminada' }));
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(organization);

            expect(organizationService.delete).toHaveBeenCalledWith('org-1');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(organizationService.list).toHaveBeenCalled();
        });

        it('shows an error toast and does not reload when the delete fails', () => {
            organizationService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo eliminar.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(organization);

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo eliminar.' }));
            expect(organizationService.list).not.toHaveBeenCalled();
        });
    });

    describe('confirmRestore()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('asks for confirmation, and on accept restores + reloads the list', () => {
            organizationService.restore.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'Restaurada' }));
            organizationService.list.and.returnValue(of<ListResult<Organization>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmRestore(organization);

            expect(organizationService.restore).toHaveBeenCalledWith('org-1');
            expect(organizationService.list).toHaveBeenCalled();
        });
    });
});
