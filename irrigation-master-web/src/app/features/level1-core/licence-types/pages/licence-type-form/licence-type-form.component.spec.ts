import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';

import { LicenceType } from '../../../../../shared/models/licence-type.model';
import { DetailResult, OperationResult } from '../../../../../shared/models/result.model';
import { LicenceTypeService } from '../../services/licence-type.service';
import { LicenceTypeFormComponent } from './licence-type-form.component';

const licenceType: LicenceType = {
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
    created: '2026-01-01'
};

describe('LicenceTypeFormComponent', () => {
    let component: LicenceTypeFormComponent;
    let fixture: ComponentFixture<LicenceTypeFormComponent>;
    let licenceTypeService: jasmine.SpyObj<LicenceTypeService>;
    let router: jasmine.SpyObj<Router>;
    let messageService: jasmine.SpyObj<MessageService>;

    function setup(routeId: string | null): void {
        licenceTypeService = jasmine.createSpyObj('LicenceTypeService', ['getById', 'create', 'update']);
        router = jasmine.createSpyObj('Router', ['navigate']);
        messageService = jasmine.createSpyObj('MessageService', ['add']);

        TestBed.configureTestingModule({
            imports: [LicenceTypeFormComponent],
            providers: [
                { provide: LicenceTypeService, useValue: licenceTypeService },
                { provide: Router, useValue: router },
                { provide: MessageService, useValue: messageService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(routeId ? { id: routeId } : {}) } } }
            ]
        });

        fixture = TestBed.createComponent(LicenceTypeFormComponent);
        component = fixture.componentInstance;
    }

    it('should be created', () => {
        setup(null);
        expect(component).toBeTruthy();
    });

    describe('create mode (no :id in the route)', () => {
        beforeEach(() => {
            setup(null);
            component.ngOnInit();
        });

        it('starts in create mode and does not fetch an existing licence type', () => {
            expect(component.isEditMode()).toBe(false);
            expect(licenceTypeService.getById).not.toHaveBeenCalled();
        });

        it('defaults maxLevelAllowed to "Core"', () => {
            expect(component.form.controls.maxLevelAllowed.value).toBe('Core');
        });

        it('does not submit an invalid (empty) form', () => {
            component.form.patchValue({ name: '', licenseCode: '' });

            component.save();

            expect(licenceTypeService.create).not.toHaveBeenCalled();
            expect(component.form.controls.name.touched).toBe(true);
        });

        it('on a valid form, creates the licence type and navigates back to the list', () => {
            licenceTypeService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: true, message: 'ok', data: 'new-id' }));
            component.form.setValue({
                name: 'Plan Básico',
                licenseCode: 'LIC-BAS-001',
                description: '',
                durationInDays: 30,
                priceAmount: 9.99,
                priceCurrency: 'EUR',
                isUsageBased: false,
                maxLevelAllowed: 'Core'
            });

            component.save();

            expect(licenceTypeService.create).toHaveBeenCalledWith({
                name: 'Plan Básico',
                licenseCode: 'LIC-BAS-001',
                description: '',
                durationInDays: 30,
                priceAmount: 9.99,
                priceCurrency: 'EUR',
                isUsageBased: false,
                maxLevelAllowed: 'Core'
            });
            expect(router.navigate).toHaveBeenCalledWith(['/licence-types']);
            expect(messageService.add).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'success' }));
        });

        it('on a 400 with a real backend validation message, shows it and does not navigate', () => {
            licenceTypeService.create.and.returnValue(of<OperationResult<string>>({ isSuccess: false, message: 'El código de licencia ya existe.' }));
            component.form.patchValue({ name: 'Plan Básico', licenseCode: 'LIC-BAS-001' });

            component.save();

            expect(component.errorMessage()).toBe('El código de licencia ya existe.');
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });

    describe('edit mode (:id present in the route)', () => {
        it('loads the licence type and patches the form', () => {
            setup('licence-type-1');
            licenceTypeService.getById.and.returnValue(of<DetailResult<LicenceType>>({ isSuccess: true, message: 'ok', data: licenceType }));

            component.ngOnInit();

            expect(component.isEditMode()).toBe(true);
            expect(licenceTypeService.getById).toHaveBeenCalledWith('licence-type-1');
            expect(component.form.getRawValue().name).toBe('Plan Operativo Profesional');
            expect(component.form.getRawValue().maxLevelAllowed).toBe('Operational');
        });

        it('on a 404, shows the backend message instead of a blank form', () => {
            setup('missing');
            licenceTypeService.getById.and.returnValue(of<DetailResult<LicenceType>>({ isSuccess: false, message: 'No se ha encontrado el registro solicitado.' }));

            component.ngOnInit();

            expect(component.errorMessage()).toBe('No se ha encontrado el registro solicitado.');
        });

        it('on save, calls update() with the route id', () => {
            setup('licence-type-1');
            licenceTypeService.getById.and.returnValue(of<DetailResult<LicenceType>>({ isSuccess: true, message: 'ok', data: licenceType }));
            licenceTypeService.update.and.returnValue(of<OperationResult<boolean>>({ isSuccess: true, message: 'ok' }));
            component.ngOnInit();

            component.save();

            expect(licenceTypeService.update).toHaveBeenCalledWith('licence-type-1', {
                id: 'licence-type-1',
                name: 'Plan Operativo Profesional',
                licenseCode: 'LIC-OP-004',
                description: 'Plan estandar',
                durationInDays: 365,
                priceAmount: 149.99,
                priceCurrency: 'USD',
                isUsageBased: false,
                maxLevelAllowed: 'Operational'
            });
            expect(router.navigate).toHaveBeenCalledWith(['/licence-types']);
        });
    });

    it('cancel() navigates back to the list', () => {
        setup(null);

        component.cancel();

        expect(router.navigate).toHaveBeenCalledWith(['/licence-types']);
    });
});
