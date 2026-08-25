import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { CurrentSessionService } from '../../../../../core/services/current-session';
import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { ListResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../services/licence-type.service';
import { LicenceListComponent } from './licence-list.component';

function licenceType(overrides: Partial<LicenceType> = {}): LicenceType {
    return {
        id: 'licence-type-1',
        name: 'Plan Operativo Profesional',
        licenseCode: 'LIC-OP-004',
        description: 'Plan estandar',
        durationInDays: 365,
        priceAmount: 149.99,
        priceCurrency: 'USD',
        isUsageBased: false,
        maxLevelAllowed: 'Operational',
        isDeleted: false,
        created: '2026-01-01',
        ...overrides
    };
}

describe('LicenceListComponent', () => {
    let component: LicenceListComponent;
    let fixture: ComponentFixture<LicenceListComponent>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let currentSession: jasmine.SpyObj<CurrentSessionService>;
    let messageService: jasmine.SpyObj<MessageService>;
    let confirmationService: jasmine.SpyObj<ConfirmationService>;

    function setup(role: string | null): void {
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['list', 'delete']);
        licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [], totalCount: 0 }));
        currentSession = jasmine.createSpyObj('CurrentSessionService', ['getRole']);
        currentSession.getRole.and.returnValue(role);
        messageService = jasmine.createSpyObj('MessageService', ['add']);
        confirmationService = jasmine.createSpyObj('ConfirmationService', ['confirm']);

        TestBed.configureTestingModule({
            imports: [LicenceListComponent],
            providers: [
                provideRouter([]),
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: CurrentSessionService, useValue: currentSession },
                { provide: MessageService, useValue: messageService },
                { provide: ConfirmationService, useValue: confirmationService }
            ]
        });

        fixture = TestBed.createComponent(LicenceListComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup('SUPERADMIN');
        expect(component).toBeTruthy();
    });

    it('exposes isSuperAdmin as true for SUPERADMIN', () => {
        setup('SUPERADMIN');
        expect(component.isSuperAdmin).toBe(true);
    });

    it('exposes isSuperAdmin as false for any other role', () => {
        setup('PRESIDENTE');
        expect(component.isSuperAdmin).toBe(false);
    });

    describe('maxLevelLabel()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('translates each SystemLevel to its Spanish label', () => {
            expect(component.maxLevelLabel(licenceType({ maxLevelAllowed: 'Core' }))).toBe('Core (Nivel 1)');
            expect(component.maxLevelLabel(licenceType({ maxLevelAllowed: 'Structure' }))).toBe('Estructura (Nivel 2)');
            expect(component.maxLevelLabel(licenceType({ maxLevelAllowed: 'Planning' }))).toBe('Planificación (Nivel 3)');
            expect(component.maxLevelLabel(licenceType({ maxLevelAllowed: 'Operational' }))).toBe('Operacional (Nivel 4)');
            expect(component.maxLevelLabel(licenceType({ maxLevelAllowed: 'Administrative' }))).toBe('Administrativo (Nivel 5)');
        });
    });

    describe('onLazyLoad()', () => {
        it('loads a page and exposes the items/total on success', () => {
            setup('SUPERADMIN');
            licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: true, message: 'ok', items: [licenceType()], totalCount: 1 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(licenceTypeService.list).toHaveBeenCalledWith(1, 10);
            expect(component.licenceTypes().length).toBe(1);
            expect(component.totalRecords()).toBe(1);
        });

        it('surfaces the backend/network error message on failure', () => {
            setup('SUPERADMIN');
            licenceTypeService.list.and.returnValue(of<ListResult<LicenceType>>({ isSuccess: false, message: 'No se pudo establecer comunicación con el servidor.', items: [], totalCount: 0 }));

            component.onLazyLoad({ first: 0, rows: 10 });

            expect(component.errorMessage()).toBe('No se pudo establecer comunicación con el servidor.');
        });
    });

    describe('confirmDelete()', () => {
        beforeEach(() => setup('SUPERADMIN'));

        it('asks for confirmation, and on accept deletes + reloads the list', () => {
            licenceTypeService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());

            component.confirmDelete(licenceType({ id: 'licence-type-9' }));

            expect(licenceTypeService.delete).toHaveBeenCalledWith('licence-type-9');
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
            expect(licenceTypeService.list).toHaveBeenCalled();
        });

        it('on failure, shows an error toast with the real message and does not reload', () => {
            licenceTypeService.delete.and.returnValue(of<OperationResult<boolean>>({ isSuccess: false, message: 'No se pudo eliminar: hay licencias asignadas de este tipo.' }));
            confirmationService.confirm.and.callFake((c) => c.accept!());
            licenceTypeService.list.calls.reset();

            component.confirmDelete(licenceType({}));

            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'No se pudo eliminar: hay licencias asignadas de este tipo.' }));
            expect(licenceTypeService.list).not.toHaveBeenCalled();
        });
    });
});
