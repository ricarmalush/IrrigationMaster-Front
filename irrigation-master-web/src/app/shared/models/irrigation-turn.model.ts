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
