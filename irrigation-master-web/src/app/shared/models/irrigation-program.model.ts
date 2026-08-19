// StartTime viaja como "HH:mm:ss" -- .NET 9/System.Text.Json serializa TimeSpan de forma nativa
// con ese formato (constante "c"), sin converter custom en el backend.
// DaysOfWeek es un CSV de enteros ISO-8601 (Lunes=1 ... Domingo=7, p. ej. "1,3,5") -- convención
// que exige GetIsIrrigationDayHandler en el backend y que ya usa la App MAUI.
// Los 4 campos de temporada son "todo o nada": o los 4 vienen informados, o ninguno.
export interface IrrigationProgram {
    id: string;
    name: string;
    startTime: string;
    durationMinutes: number;
    daysOfWeek: string;
    isActive: boolean;
    organizationId: string;
    hydraulicSectorId: string;
    created: string;
    seasonStartMonth?: number | null;
    seasonStartDay?: number | null;
    seasonEndMonth?: number | null;
    seasonEndDay?: number | null;
}

export interface CreateIrrigationProgramRequest {
    name: string;
    startTime: string;
    durationMinutes: number;
    daysOfWeek: string;
    hydraulicSectorId: string;
    seasonStartMonth?: number | null;
    seasonStartDay?: number | null;
    seasonEndMonth?: number | null;
    seasonEndDay?: number | null;
}

// Sin hydraulicSectorId a propósito: el backend no admite cambiar el sector de un programa
// existente (Update() en la entidad no lo acepta como parámetro).
export interface UpdateIrrigationProgramRequest {
    id: string;
    name: string;
    startTime: string;
    durationMinutes: number;
    daysOfWeek: string;
    isActive: boolean;
    seasonStartMonth?: number | null;
    seasonStartDay?: number | null;
    seasonEndMonth?: number | null;
    seasonEndDay?: number | null;
}
