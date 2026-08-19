import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';

import { ComingSoonComponent } from './coming-soon.component';

describe('ComingSoonComponent', () => {
    let fixture: ComponentFixture<ComingSoonComponent>;

    function setup(title: string | undefined): void {
        TestBed.configureTestingModule({
            imports: [ComingSoonComponent],
            providers: [{ provide: ActivatedRoute, useValue: { snapshot: { data: title !== undefined ? { title } : {} } } }]
        });

        fixture = TestBed.createComponent(ComingSoonComponent);
    }

    it('should be created', () => {
        setup('Estado de Riego');
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('shows the title from route data', () => {
        setup('Configuración del Sistema');
        expect(fixture.componentInstance.title).toBe('Configuración del Sistema');
    });

    it('falls back to a generic title when route data has none', () => {
        setup(undefined);
        expect(fixture.componentInstance.title).toBe('Próximamente');
    });
});
