import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { CurrentSessionService } from '@/app/core/services/current-session';

const BROADCAST_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'VICEPRESIDENTE'];

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    template: `<ul class="layout-menu">
        @for (item of model(); track item.label) {
            @if (!item.separator) {
                <li app-menuitem [item]="item" [root]="true"></li>
            } @else {
                <li class="menu-separator"></li>
            }
        }
    </ul> `,
})
export class AppMenu {
    private currentSession = inject(CurrentSessionService);

    // computed(), no un array fijo: AppMenu vive dentro del AppLayout persistente y no se
    // reconstruye al navegar (a diferencia de las páginas de listado, que sí son instancias
    // nuevas cada vez). Un array evaluado una sola vez en la construcción se quedaba congelado
    // con el rol que hubiera en ese instante para el resto de la sesión -- de ahí el bug donde
    // "Avisar a mi comunidad" no aparecía para SUPERADMIN. Al depender de currentSession.role()
    // (señal), se recalcula solo en cuanto el rol cambia o llega a estar disponible.
    model = computed<MenuItem[]>(() => [
        {
            label: 'Home',
            items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', routerLink: ['/'] }]
        },
        {
            label: 'Estructura',
            items: [
                { label: 'Organizaciones', icon: 'pi pi-fw pi-building', routerLink: ['/organizations'] },
                { label: 'Sectores', icon: 'pi pi-fw pi-sitemap', routerLink: ['/hydraulic-sectors'] },
                { label: 'Andadores', icon: 'pi pi-fw pi-directions', routerLink: ['/walkways'] }
            ]
        },
        {
            label: 'Usuarios',
            items: [{ label: 'Usuarios', icon: 'pi pi-fw pi-users', routerLink: ['/users'] }]
        },
        {
            label: 'Comunidad',
            items: [
                { label: 'Reportar incidencia', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/notifications/report-incident'] },
                ...(this.canBroadcast()
                    ? [{ label: 'Avisar a mi comunidad', icon: 'pi pi-fw pi-megaphone', routerLink: ['/notifications/community-broadcast'] }]
                    : [])
            ]
        }
    ]);

    private canBroadcast(): boolean {
        return BROADCAST_ROLES.includes(this.currentSession.role() ?? '');
    }
}
