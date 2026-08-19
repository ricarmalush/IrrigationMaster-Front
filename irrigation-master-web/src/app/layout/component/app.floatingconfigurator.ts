import {Component, computed, inject, input} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StyleClassModule } from 'primeng/styleclass';
import { AppConfigurator } from './app.configurator';
import { LayoutService } from '@/app/layout/service/layout.service';
import {CommonModule} from "@angular/common";

const THEME_ICONS: Record<string, string> = {
    light: 'pi pi-sun',
    soft: 'pi pi-cloud',
    dark: 'pi pi-moon'
};

@Component({
    selector: 'app-floating-configurator',
    imports: [CommonModule, ButtonModule, StyleClassModule, AppConfigurator],
    template: `
        <div class="flex gap-4 top-8 right-8" [ngClass]="{'fixed':float()}">
            <p-button type="button" (onClick)="layoutService.cycleTheme()" [rounded]="true" [icon]="themeIcon()" severity="secondary" />
            <div class="relative">
                <p-button icon="pi pi-palette" pStyleClass="@next" enterFromClass="hidden" enterActiveClass="animate-scalein" leaveToClass="hidden" leaveActiveClass="animate-fadeout" [hideOnOutsideClick]="true" type="button" rounded />
                <app-configurator />
            </div>
        </div>
    `
})
export class AppFloatingConfigurator {
    layoutService = inject(LayoutService);

    float = input<boolean>(true);

    themeIcon = computed(() => THEME_ICONS[this.layoutService.layoutConfig().theme]);
}
