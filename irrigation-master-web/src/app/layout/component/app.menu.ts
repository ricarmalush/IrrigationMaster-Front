import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model; track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    // Ir añadiendo entradas aquí a medida que cada módulo de app.routes.ts se descomenta.
    model: MenuItem[] = [
        {
            label: 'Home',
            items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
        },
        {
            label: 'Estructura',
            items: [
                { label: 'Organizaciones', icon: 'pi pi-fw pi-building', routerLink: ['/organizations'] },
                { label: 'Sectores', icon: 'pi pi-fw pi-sitemap', routerLink: ['/hydraulic-sectors'] }
            ]
        }
    ];
}
