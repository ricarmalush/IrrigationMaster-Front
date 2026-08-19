import { TestBed } from '@angular/core/testing';

import { LayoutService, THEME_STORAGE_KEY } from './layout.service';

describe('LayoutService', () => {
    function createService(): LayoutService {
        TestBed.configureTestingModule({});
        const service = TestBed.inject(LayoutService);
        TestBed.flushEffects();
        return service;
    }

    beforeEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');

        // La API real de View Transitions es asíncrona/animada -- en Chrome headless es
        // inestable dentro de un test. La sustituimos por una versión síncrona: nos interesa
        // que se aplique la clase correcta, no la animación del navegador.
        if ('startViewTransition' in document) {
            spyOn(document as unknown as { startViewTransition: (cb: () => void) => unknown }, 'startViewTransition').and.callFake((callback: () => void) => {
                callback();
                return {};
            });
        }
    });

    afterEach(() => {
        localStorage.clear();
        document.documentElement.classList.remove('app-dark', 'app-soft');
    });

    it('should be created', () => {
        expect(createService()).toBeTruthy();
    });

    describe('initial theme', () => {
        it('defaults to light when nothing is stored', () => {
            const service = createService();

            expect(service.layoutConfig().theme).toBe('light');
            expect(document.documentElement.classList.contains('app-dark')).toBe(false);
            expect(document.documentElement.classList.contains('app-soft')).toBe(false);
        });

        it('reads a previously stored theme and applies its class on construction', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'soft');

            const service = createService();

            expect(service.layoutConfig().theme).toBe('soft');
            expect(document.documentElement.classList.contains('app-soft')).toBe(true);
            expect(document.documentElement.classList.contains('app-dark')).toBe(false);
        });

        it('reads a stored dark theme and applies app-dark on construction', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'dark');

            const service = createService();

            expect(service.layoutConfig().theme).toBe('dark');
            expect(document.documentElement.classList.contains('app-dark')).toBe(true);
        });

        it('falls back to light for a corrupt/unknown stored value', () => {
            localStorage.setItem(THEME_STORAGE_KEY, 'not-a-real-theme');

            const service = createService();

            expect(service.layoutConfig().theme).toBe('light');
        });
    });

    describe('setTheme()', () => {
        it('updates the config signal and persists the choice', () => {
            const service = createService();

            service.setTheme('soft');
            TestBed.flushEffects();

            expect(service.layoutConfig().theme).toBe('soft');
            expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('soft');
        });

        it('applies app-soft (and not app-dark) for the soft theme', () => {
            const service = createService();

            service.setTheme('soft');
            TestBed.flushEffects();

            expect(document.documentElement.classList.contains('app-soft')).toBe(true);
            expect(document.documentElement.classList.contains('app-dark')).toBe(false);
        });

        it('applies app-dark (and not app-soft) for the dark theme', () => {
            const service = createService();

            service.setTheme('dark');
            TestBed.flushEffects();

            expect(document.documentElement.classList.contains('app-dark')).toBe(true);
            expect(document.documentElement.classList.contains('app-soft')).toBe(false);
        });

        it('removes both classes when switching back to light', () => {
            const service = createService();

            service.setTheme('dark');
            TestBed.flushEffects();
            service.setTheme('light');
            TestBed.flushEffects();

            expect(document.documentElement.classList.contains('app-dark')).toBe(false);
            expect(document.documentElement.classList.contains('app-soft')).toBe(false);
        });

        it('updates isDarkTheme()/isSoftTheme()', () => {
            const service = createService();

            service.setTheme('dark');
            expect(service.isDarkTheme()).toBe(true);
            expect(service.isSoftTheme()).toBe(false);

            service.setTheme('soft');
            expect(service.isDarkTheme()).toBe(false);
            expect(service.isSoftTheme()).toBe(true);
        });
    });

    describe('cycleTheme()', () => {
        it('goes light -> soft -> dark -> light', () => {
            const service = createService();
            expect(service.layoutConfig().theme).toBe('light');

            service.cycleTheme();
            expect(service.layoutConfig().theme).toBe('soft');

            service.cycleTheme();
            expect(service.layoutConfig().theme).toBe('dark');

            service.cycleTheme();
            expect(service.layoutConfig().theme).toBe('light');
        });
    });
});
