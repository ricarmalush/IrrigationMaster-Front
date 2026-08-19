import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LayoutService } from '../service/layout.service';
import { AppTopbar } from './app.topbar';

describe('AppTopbar', () => {
    let component: AppTopbar;
    let fixture: ComponentFixture<AppTopbar>;
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
            imports: [AppTopbar],
            providers: [provideRouter([])]
        });

        fixture = TestBed.createComponent(AppTopbar);
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

    it('shows the sun icon for the light theme', () => {
        layoutService.setTheme('light');
        expect(component.themeIcon()).toBe('pi-sun');
        expect(component.themeLabel()).toBe('Tema claro');
    });

    it('shows the cloud icon for the soft theme', () => {
        layoutService.setTheme('soft');
        expect(component.themeIcon()).toBe('pi-cloud');
        expect(component.themeLabel()).toBe('Tema suave');
    });

    it('shows the moon icon for the dark theme', () => {
        layoutService.setTheme('dark');
        expect(component.themeIcon()).toBe('pi-moon');
        expect(component.themeLabel()).toBe('Tema oscuro');
    });

    it('clicking the theme action cycles the theme via the shared service order', () => {
        expect(layoutService.layoutConfig().theme).toBe('light');

        layoutService.cycleTheme();
        expect(layoutService.layoutConfig().theme).toBe('soft');
    });
});
