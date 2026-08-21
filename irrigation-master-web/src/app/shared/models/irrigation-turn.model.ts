// Espejo de PendingApprovalIrrigationTurnDto (GET IrrigationTurns/pending-approval): solo turnos en
// estado "Requested" de la organización del que llama, ya con el nombre del solicitante resuelto,
// pero el sector solo como id (se resuelve en el cliente, igual que en Programs).
export interface PendingApprovalTurn {
    id: string;
    requesterId: string;
    requesterFullName: string;
    hydraulicSectorId: string;
    scheduledStart: string;
    scheduledEnd: string;
}

export type NeighborTurnStatus = 'Watering' | 'Waiting' | 'Completed';

// Espejo de NeighborIrrigationStatusDto (GET IrrigationTurns/status): Status ya colapsa
// Requested/Pending en "Waiting" -- IsApproved es lo único que distingue "esperando aprobación"
// de "aprobado, puede empezar" dentro de ese mismo estado "Waiting".
export interface NeighborIrrigationStatus {
    userId: string;
    turnId: string;
    fullName: string;
    status: NeighborTurnStatus;
    scheduledStart: string;
    scheduledEnd: string;
    isApproved: boolean;
}

// Espejo de WalkwayIrrigationStatusDto: el agrupado por andador viene ya resuelto del backend
// (via RequesterId -> User.WalkwayId, no via HydraulicSectorId -- ver comentario en el servicio).
export interface WalkwayIrrigationStatus {
    walkwayId: string;
    walkwayCode: string;
    neighbors: NeighborIrrigationStatus[];
}

// Espejo de CreateIrrigationTurnRequestDto ("Solicitar mi turno").
export interface CreateIrrigationTurnRequest {
    startTime: string;
    endTime: string;
    hydraulicSectorId: string;
    requesterId: string;
    priority?: number;
}
