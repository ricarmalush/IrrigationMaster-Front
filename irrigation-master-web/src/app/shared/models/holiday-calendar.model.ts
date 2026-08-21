// Espejo de HolidayCalendarResponseDto. Sin restricción de rol en el Front -- el backend tampoco
// la tiene (cualquier autenticado de la organización puede gestionar festivos hoy).
export interface HolidayCalendar {
    id: string;
    date: string;
    description: string;
    isNationalHoliday: boolean;
    organizationId: string;
    created: string;
}

export interface CreateHolidayCalendarRequest {
    date: string;
    description: string;
    isNationalHoliday: boolean;
}

export interface UpdateHolidayCalendarRequest {
    id: string;
    date: string;
    description: string;
    isNationalHoliday: boolean;
}
