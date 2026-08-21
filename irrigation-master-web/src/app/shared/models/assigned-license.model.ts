// Espejo de AssignedLicenseResponseDto. IsExpired es una propiedad calculada del dominio (nunca
// se persiste) -- puede quedar desincronizada de IsActive: nada desactiva una licencia
// automaticamente al caducar. La combinacion de ambas se refleja como un unico estado en el Front.
export interface AssignedLicense {
    id: string;
    organizationId: string;
    licenceTypeId: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isExpired: boolean;
    created: string;
}

export interface CreateAssignedLicenseRequest {
    organizationId: string;
    licenceTypeId: string;
    durationDays: number;
}

export interface RenewLicenseRequest {
    id: string;
    extraDays: number;
}
