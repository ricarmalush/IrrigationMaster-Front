import { Routes } from '@angular/router';
import { AppLayout } from './app/layout/component/app.layout';
import { Dashboard } from './app/pages/dashboard/dashboard';
import { Notfound } from './app/pages/notfound/notfound';
import { authGuard } from './app/core/guards/auth.guard';
import { ComingSoonComponent } from './app/shared/pages/coming-soon/coming-soon.component';

export const appRoutes: Routes = [
    {
        path: '',
        component: AppLayout,
        canActivate: [authGuard],
        children: [
            // 1. PANTALLA PRINCIPAL
            { path: '', component: Dashboard },

            // ==========================================
            // 2. TUS MÓDULOS DE NEGOCIO (Carga Perezosa / Lazy Loading)
            // Descomenta estas líneas conforme vayas creando los componentes
            // ==========================================

            // NIVEL 1: CORE
            // { path: 'countries', loadComponent: () => import('./app/features/level1-core/countries/pages/countries/countries.component').then(c => c.CountriesComponent) },
            // { path: 'crops', loadComponent: () => import('./app/features/level1-core/crops/pages/crops/crops.component').then(c => c.CropsComponent) },
            // { path: 'roles', loadComponent: () => import('./app/features/level1-core/roles/pages/roles/roles.component').then(c => c.RolesComponent) },

            // NIVEL 2: STRUCTURE
            { path: 'organizations', loadComponent: () => import('./app/features/level2-structure/organizations/pages/organization-list/organization-list.component').then((c) => c.OrganizationListComponent) },
            { path: 'organizations/new', loadComponent: () => import('./app/features/level2-structure/organizations/pages/organization-detail/organization-detail.component').then((c) => c.OrganizationDetailComponent) },
            { path: 'organizations/:id', loadComponent: () => import('./app/features/level2-structure/organizations/pages/organization-detail/organization-detail.component').then((c) => c.OrganizationDetailComponent) },
            { path: 'hydraulic-sectors', loadComponent: () => import('./app/features/level2-structure/hydraulic-sectors/pages/sector-list/sector-list.component').then((c) => c.SectorListComponent) },
            { path: 'hydraulic-sectors/new', loadComponent: () => import('./app/features/level2-structure/hydraulic-sectors/pages/sector-form/sector-form.component').then((c) => c.SectorFormComponent) },
            { path: 'hydraulic-sectors/:id', loadComponent: () => import('./app/features/level2-structure/hydraulic-sectors/pages/sector-form/sector-form.component').then((c) => c.SectorFormComponent) },
            { path: 'walkways', loadComponent: () => import('./app/features/level2-structure/walkways/pages/walkway-list/walkway-list.component').then((c) => c.WalkwayListComponent) },
            { path: 'walkways/new', loadComponent: () => import('./app/features/level2-structure/walkways/pages/walkway-form/walkway-form.component').then((c) => c.WalkwayFormComponent) },
            { path: 'walkways/:id', loadComponent: () => import('./app/features/level2-structure/walkways/pages/walkway-form/walkway-form.component').then((c) => c.WalkwayFormComponent) },

            // NIVEL 3: FUNCTIONAL
            { path: 'users', loadComponent: () => import('./app/features/level3-functional/users/pages/user-list/user-list.component').then((c) => c.UserListComponent) },
            { path: 'users/new', loadComponent: () => import('./app/features/level3-functional/users/pages/user-detail/user-detail.component').then((c) => c.UserDetailComponent) },
            { path: 'users/:id', loadComponent: () => import('./app/features/level3-functional/users/pages/user-detail/user-detail.component').then((c) => c.UserDetailComponent) },
            // { path: 'plots', loadComponent: () => import('./app/features/level3-functional/plots/pages/plots/plots.component').then(c => c.PlotsComponent) },
            { path: 'irrigation-programs', loadComponent: () => import('./app/features/level3-functional/irrigation-programs/pages/program-list/program-list.component').then((c) => c.ProgramListComponent) },
            { path: 'irrigation-programs/new', loadComponent: () => import('./app/features/level3-functional/irrigation-programs/pages/program-form/program-form.component').then((c) => c.ProgramFormComponent) },
            { path: 'irrigation-programs/:id', loadComponent: () => import('./app/features/level3-functional/irrigation-programs/pages/program-form/program-form.component').then((c) => c.ProgramFormComponent) },

            // NIVEL 4: OPERATIONAL
            // { path: 'valves', loadComponent: () => import('./app/features/level4-operational/valves/pages/valves/valves.component').then(c => c.ValvesComponent) },
            {
                path: 'irrigation-turns/approve',
                loadComponent: () => import('./app/features/level4-operational/irrigation-turns/pages/turn-approval-list/turn-approval-list.component').then((c) => c.TurnApprovalListComponent)
            },
            {
                path: 'irrigation-status',
                loadComponent: () => import('./app/features/level4-operational/irrigation-turns/pages/irrigation-status/irrigation-status.component').then((c) => c.IrrigationStatusComponent)
            },
            // { path: 'sensors', loadComponent: () => import('./app/features/level4-operational/sensors/pages/sensors/sensors.component').then(c => c.SensorsComponent) },

            // NIVEL 5: EQUIPMENT
            {
                path: 'notifications',
                loadComponent: () => import('./app/features/level5-equipment/notifications/pages/notification-center/notification-center.component').then((c) => c.NotificationCenterComponent)
            },
            {
                path: 'notifications/report-incident',
                loadComponent: () => import('./app/features/level5-equipment/notifications/pages/report-incident/report-incident.component').then((c) => c.ReportIncidentComponent)
            },
            {
                path: 'notifications/community-broadcast',
                loadComponent: () => import('./app/features/level5-equipment/notifications/pages/community-broadcast/community-broadcast.component').then((c) => c.CommunityBroadcastComponent)
            },
            // { path: 'invoices', loadComponent: () => import('./app/features/level5-equipment/invoices/pages/invoices/invoices.component').then(c => c.InvoicesComponent) },
            // { path: 'audit-logs', loadComponent: () => import('./app/features/level5-equipment/audit-logs/pages/audit-logs/audit-logs.component').then(c => c.AuditLogsComponent) },
            { path: 'system-settings', loadComponent: () => import('./app/features/system-settings/pages/system-settings/system-settings.component').then((c) => c.SystemSettingsComponent) },
            {
                path: 'system-settings/holidays',
                loadComponent: () => import('./app/features/level1-core/holiday-calendars/pages/calendar-management/calendar-management.component').then((c) => c.CalendarManagementComponent)
            },
            {
                path: 'system-settings/holidays/new',
                loadComponent: () => import('./app/features/level1-core/holiday-calendars/pages/holiday-form/holiday-form.component').then((c) => c.HolidayFormComponent)
            },
            {
                path: 'system-settings/holidays/:id',
                loadComponent: () => import('./app/features/level1-core/holiday-calendars/pages/holiday-form/holiday-form.component').then((c) => c.HolidayFormComponent)
            },

            // PLATAFORMA (back-office SUPERADMIN, cross-tenant)
            { path: 'licences', loadComponent: () => import('./app/features/level2-structure/assigned-licenses/pages/license-list/license-list.component').then((c) => c.LicenseListComponent) },
            { path: 'licences/new', loadComponent: () => import('./app/features/level2-structure/assigned-licenses/pages/license-assign/license-assign.component').then((c) => c.LicenseAssignComponent) }
        ]
    },

    // ==========================================
    // 3. RUTAS A PANTALLA COMPLETA (Sin Layout de Sakai)
    // ==========================================

    // 👇 ESTA ES LA LÍNEA MÁGICA QUE ABRE LA PUERTA AL LOGIN 👇
    {
        path: 'login',
        loadComponent: () => import('./app/core/auth/pages/login/login').then(c => c.Login)
    },

    // ==========================================
    // 4. MANEJO DE ERRORES Y COMODÍN
    // ==========================================
    { path: 'notfound', component: Notfound },
    { path: '**', redirectTo: '/notfound' }
];
