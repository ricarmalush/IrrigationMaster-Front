import { Injectable, effect, signal, computed } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'soft';

export interface LayoutConfig {
    preset: string;
    primary: string;
    surface: string | undefined | null;
    theme: ThemeMode;
    menuMode: string;
}

interface LayoutState {
    staticMenuDesktopInactive: boolean;
    overlayMenuActive: boolean;
    configSidebarVisible: boolean;
    mobileMenuActive: boolean;
    menuHoverActive: boolean;
    activePath: string | null;
}

export const THEME_STORAGE_KEY = 'irrigationmaster-theme';

// Claro -> Suave -> Oscuro -> Claro: un solo orden, compartido por el icono cíclico de la
// topbar/404 y por cualquier otro sitio que necesite "el siguiente tema".
export const THEME_CYCLE: ThemeMode[] = ['light', 'soft', 'dark'];

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    layoutConfig = signal<LayoutConfig>({
        preset: 'Aura',
        primary: 'emerald',
        surface: null,
        theme: this.readStoredTheme(),
        menuMode: 'static'
    });

    layoutState = signal<LayoutState>({
        staticMenuDesktopInactive: false,
        overlayMenuActive: false,
        configSidebarVisible: false,
        mobileMenuActive: false,
        menuHoverActive: false,
        activePath: null
    });

    isSidebarActive = computed(() => this.layoutState().overlayMenuActive || this.layoutState().mobileMenuActive);

    isDarkTheme = computed(() => this.layoutConfig().theme === 'dark');

    isSoftTheme = computed(() => this.layoutConfig().theme === 'soft');

    getPrimary = computed(() => this.layoutConfig().primary);

    getSurface = computed(() => this.layoutConfig().surface);

    isOverlay = computed(() => this.layoutConfig().menuMode === 'overlay');

    transitionComplete = signal<boolean>(false);

    private initialized = false;

    constructor() {
        effect(() => {
            const config = this.layoutConfig();
            this.persistTheme(config.theme);

            if (!this.initialized) {
                this.initialized = true;
                this.applyThemeClasses(config.theme);
                return;
            }

            this.handleDarkModeTransition(config);
        });
    }

    setTheme(theme: ThemeMode): void {
        this.layoutConfig.update((state) => ({ ...state, theme }));
    }

    cycleTheme(): void {
        const current = this.layoutConfig().theme;
        const next = THEME_CYCLE[(THEME_CYCLE.indexOf(current) + 1) % THEME_CYCLE.length];
        this.setTheme(next);
    }

    private handleDarkModeTransition(config: LayoutConfig): void {
        const supportsViewTransition = 'startViewTransition' in document;

        if (supportsViewTransition) {
            this.startViewTransition(config);
        } else {
            this.applyThemeClasses(config.theme);
        }
    }

    private startViewTransition(config: LayoutConfig): void {
        document.startViewTransition(() => {
            this.applyThemeClasses(config.theme);
        });
    }

    private applyThemeClasses(theme: ThemeMode): void {
        document.documentElement.classList.toggle('app-dark', theme === 'dark');
        document.documentElement.classList.toggle('app-soft', theme === 'soft');
    }

    private readStoredTheme(): ThemeMode {
        if (typeof localStorage === 'undefined') {
            return 'light';
        }

        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        return stored === 'dark' || stored === 'soft' || stored === 'light' ? stored : 'light';
    }

    private persistTheme(theme: ThemeMode): void {
        if (typeof localStorage === 'undefined') {
            return;
        }

        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    onMenuToggle() {
        if (this.isOverlay()) {
            this.layoutState.update((prev) => ({ ...prev, overlayMenuActive: !this.layoutState().overlayMenuActive }));
        }

        if (this.isDesktop()) {
            this.layoutState.update((prev) => ({ ...prev, staticMenuDesktopInactive: !this.layoutState().staticMenuDesktopInactive }));
        } else {
            this.layoutState.update((prev) => ({ ...prev, mobileMenuActive: !this.layoutState().mobileMenuActive }));
        }
    }

    showConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: true }));
    }

    hideConfigSidebar() {
        this.layoutState.update((prev) => ({ ...prev, configSidebarVisible: false }));
    }

    isDesktop() {
        return window.innerWidth > 991;
    }

    isMobile() {
        return !this.isDesktop();
    }
}
