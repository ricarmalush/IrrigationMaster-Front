import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LayoutService } from '../service/layout.service';
import { AppConfigurator } from './app.configurator';

describe('AppConfigurator', () => {
    let component: AppConfigurator;
    let fixture: ComponentFixture<AppConfigurator>;
    let layoutService: LayoutService;

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');

        if ('startViewTransition' in document) {
            spyOn(document as unknown as { startViewTransition: (cb: () => void) => unknown }, 'startViewTransition').and.callFake((callback: () => void) => {
                callback();
                return {};
            });
        }

        TestBed.configureTestingModule({
            imports: [AppConfigurator],
            providers: [provideRouter([])]
        });

        fixture = TestBed.createComponent(AppConfigurator);
        component = fixture.componentInstance;
        layoutService = TestBed.inject(LayoutService);
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');
    });

    it('should be created', () => {
        expect(component).toBeTruthy();
    });

    it('exposes the three theme options in the expected order', () => {
        expect(component.themeOptions.map((o) => o.value)).toEqual(['light', 'soft', 'dark']);
    });

    it('selectedTheme() reflects the current layout config', () => {
        layoutService.setTheme('soft');
        expect(component.selectedTheme()).toBe('soft');
    });

    it('onThemeChange() delegates to LayoutService.setTheme()', () => {
        component.onThemeChange('dark');
        expect(layoutService.layoutConfig().theme).toBe('dark');
    });
});
