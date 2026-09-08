export type NeighborTurnStatus = 'Watering' | 'Waiting' | 'Completed';

// Espejo de NeighborIrrigationStatusDto (GET IrrigationTurns/status, /my-walkway-status): "Waiting"
// es accionable de inmediato (Empezar/Cancelar) -- ya no existe un paso de aprobación intermedio.
// houseNumber es UNICAMENTE informativo (orden visual descendente de la lista de espera del día)
// -- nunca condiciona qué botones se muestran. Puede venir null si el vecino todavía no tiene
// número de casa registrado.
export interface NeighborIrrigationStatus {
    userId: string;
    turnId: string;
    fullName: string;
    status: NeighborTurnStatus;
    scheduledStart: string;
    scheduledEnd: string;
    houseNumber: number | null;
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

// Espejo de WalkwayRequestedTurnDto (GET IrrigationTurns/my-walkway-status): siempre "Requested"
// hasta el día siguiente, cuando pasa a formar parte de liveToday. houseNumber es puramente
// informativo (orden visual descendente), nunca bloqueante. Ya viene ordenada por prioridad desde
// el backend (HouseNumber descendente, ThenBy hora de solicitud).
export interface WalkwayRequestedTurn {
    turnId: string;
    userId: string;
    fullName: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
    houseNumber: number | null;
}

// Espejo de TodayIrrigationScheduleDto: un tramo horario de riego que aplica HOY para el sector del
// andador consultado (ver IrrigationProgramExtensions.AppliesOn en el backend). startTime/endTime
// viajan como "HH:mm:ss" -- mismo formato nativo de TimeSpan que IrrigationProgram.startTime.
export interface TodayIrrigationSchedule {
    programId: string;
    name: string;
    startTime: string;
    endTime: string;
}

// Espejo de MyWalkwayIrrigationStatusDto: acotado SIEMPRE al andador del propio llamador (nunca un
// parámetro). walkwayId/walkwayCode son null cuando el llamador no tiene andador asignado (p. ej.
// un Presidente) -- estado válido, no un error: las tres listas vienen vacías en ese caso. liveToday
// incluye Requested/InProgress/Completed de hoy (propio y de otros vecinos del mismo andador), ya
// ordenado por HouseNumber descendente (informativo). todaySchedule son los tramos horarios de los
// Programa activos del sector que cubren hoy (puede haber 0, 1 o varios).
export interface MyWalkwayIrrigationStatus {
    walkwayId: string | null;
    walkwayCode: string | null;
    requestsTomorrow: WalkwayRequestedTurn[];
    liveToday: NeighborIrrigationStatus[];
    todaySchedule: TodayIrrigationSchedule[];
}
