import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';
import { CurrentSessionService } from '@/app/core/services/current-session';

// Mismos roles que ShowApproveTurns/ShowCommunityBroadcast en AdminMenuPage.xaml.cs de la App.
const ADMIN_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'VICEPRESIDENTE'];
const BROADCAST_ROLES = ADMIN_ROLES;
// Mismos roles que ShowIrrigationPrograms en AdminMenuPage.xaml.cs (ligado al permiso de backend
// MANAGE_IRRIGATION_PROGRAMS).
const IRRIGATION_PROGRAM_ROLES = ['SUPERADMIN', 'COORDINADOR_RIEGO'];
// Sin equivalente en la App (pantalla nueva, back-office/autoservicio). En los datos semilla del
// backend ningún rol de organización tiene asignados VIEW_ORG_INVOICES/REGISTER_PAYMENTS por
// defecto -- este es el conjunto aprobado para el gating del Front (confirmado con el usuario,
// sin VicePresidente).
const INVOICE_ROLES = ['SUPERADMIN', 'PRESIDENTE', 'COORDINADOR_RIEGO'];

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
        },
        {
            label: 'Riego',
            items: [
                { label: 'Estado de Riego', icon: 'pi pi-fw pi-chart-line', routerLink: ['/irrigation-status'] },
                ...(this.canApproveTurns() ? [{ label: 'Aprobar Turnos', icon: 'pi pi-fw pi-check-square', routerLink: ['/irrigation-turns/approve'] }] : []),
                ...(this.canManageIrrigationPrograms() ? [{ label: 'Calendario de Riego', icon: 'pi pi-fw pi-calendar', routerLink: ['/irrigation-programs'] }] : [])
            ]
        },
        {
            label: 'Notificaciones',
            items: [{ label: 'Notificaciones', icon: 'pi pi-fw pi-bell', routerLink: ['/notifications'] }]
        },
        {
            label: 'Sistema',
            items: [{ label: 'Configuración del Sistema', icon: 'pi pi-fw pi-cog', routerLink: ['/system-settings'] }]
        },
        // Autoservicio de organización + back-office: SUPERADMIN ve todas las organizaciones,
        // el resto de roles solo las suyas propias (la propia pantalla cambia de fuente según el
        // rol). Todo el grupo se omite para quien no tenga ninguno de los dos permisos.
        ...(this.canViewInvoices() ? [{ label: 'Facturación', items: [{ label: 'Facturas', icon: 'pi pi-fw pi-file-invoice', routerLink: ['/invoices'] }] }] : []),
        // Back-office cross-tenant: solo SUPERADMIN, nunca Presidente/Vicepresidente. Todo el grupo
        // se omite (no solo el ítem) para no dejar un encabezado "Plataforma" vacío. "Tipos de
        // Licencia" va antes que "Licencias": primero se define el tipo, luego se asigna.
        ...(this.isSuperAdmin()
            ? [
                  {
                      label: 'Plataforma',
                      items: [
                          { label: 'Tipos de Licencia', icon: 'pi pi-fw pi-tags', routerLink: ['/licence-types'] },
                          { label: 'Licencias', icon: 'pi pi-fw pi-verified', routerLink: ['/licences'] }
                      ]
                  }
              ]
            : [])
    ]);

    private canBroadcast(): boolean {
        return BROADCAST_ROLES.includes(this.currentSession.role() ?? '');
    }

    // Espejo de ShowApproveTurns en AdminMenuPage.xaml.cs de la App.
    private canApproveTurns(): boolean {
        return ADMIN_ROLES.includes(this.currentSession.role() ?? '');
    }

    // Espejo de ShowIrrigationPrograms en AdminMenuPage.xaml.cs de la App: no es el mismo grupo
    // de roles que "Aprobar Turnos" -- ahí es SUPERADMIN o COORDINADOR_RIEGO, no Presidente/Vice.
    private canManageIrrigationPrograms(): boolean {
        return IRRIGATION_PROGRAM_ROLES.includes(this.currentSession.role() ?? '');
    }

    private isSuperAdmin(): boolean {
        return this.currentSession.role() === 'SUPERADMIN';
    }

    private canViewInvoices(): boolean {
        return INVOICE_ROLES.includes(this.currentSession.role() ?? '');
    }
}
