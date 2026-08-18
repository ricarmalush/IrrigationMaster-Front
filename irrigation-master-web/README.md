# IrrigationMaster Web

Panel de gestión multi-tenant para IrrigationMaster. Angular 21 (standalone, zoneless) + PrimeNG 21 + Tailwind, sobre la base del template [Sakai](https://github.com/primefaces/sakai-ng), ya despojado de sus páginas de demo.

## Stack

- Angular 21 con `provideZonelessChangeDetection`
- PrimeNG 21 (tema Aura) + Tailwind
- Autenticación JWT: `AuthService` (`src/app/core/services/auth.ts`) guarda el token, `authInterceptor` lo adjunta a cada request y desloguea en un 401, `authGuard` protege las rutas del layout principal

## Estructura

```
src/app/
├── core/            # auth, guards, interceptors, servicios transversales
├── layout/          # shell de la app (topbar, sidebar, menú)
├── pages/           # dashboard, notfound
├── features/        # módulos de negocio por nivel de dominio
│   ├── level1-core/        (crops, roles, permissions, units-of-measure...)
│   ├── level2-structure/   (organizations, hydraulic-sectors, walkways...)
│   ├── level3-functional/  (irrigation-programs, plots, users)
│   ├── level4-operational/ (valves, sensors, irrigation-turns...)
│   └── level5-equipment/   (invoices, payments, audit-logs...)
└── shared/          # endpoints de API, utilidades y componentes comunes
```

Las rutas de cada feature se activan en `src/app.routes.ts` conforme se van implementando sus componentes (están comentadas como plantilla).

## Desarrollo

```bash
npm install
npm start
```

Sirve en `http://localhost:4200`. La API se configura en `src/environments/environment*.ts` (`apiUrl`).

## Próximo paso

Primer módulo funcional: calendario de riego, dentro de `features/level3-functional/irrigation-programs`.
