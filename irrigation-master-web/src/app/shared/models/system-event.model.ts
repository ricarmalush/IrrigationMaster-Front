// Espejo de SystemEventResponseDto (backend) -- registro de eventos del propio Sistema Informático
// de Facturación (SIF, RD 1007/2023): arranques, paradas, anomalías detectadas en la cadena de
// huellas. Distinto de AuditLog (que audita operaciones de negocio, no el comportamiento del
// software). Plataforma completa, no acotado a una organización -- solo lo ve SUPERADMIN.
export type SystemEventType = 'Startup' | 'Shutdown' | 'ConfigurationChanged' | 'DataExported' | 'AnomalyDetected';

export interface SystemEvent {
    id: string;
    occurredAt: string;
    eventType: SystemEventType;
    description: string;
    triggeredBy: string;
}
