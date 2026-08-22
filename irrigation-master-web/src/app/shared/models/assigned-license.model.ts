// Espejo de AssignedLicenseResponseDto. IsExpired es una propiedad calculada del dominio (nunca
// se persiste) -- puede quedar desincronizada de IsActive: nada desactiva una licencia
// automaticamente al caducar. La combinacion de ambas se refleja como un unico estado en el Front.
// userId null = licencia de organizacion (cubre a todos sus vecinos); con valor = individual,
// acotada a ese usuario concreto (que pertenece a organizationId).
export interface AssignedLicense {
    id: string;
    organizationId: string;
    licenceTypeId: string;
    userId: string | null;
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
    userId?: string | null;
}

export interface RenewLicenseRequest {
    id: string;
    extraDays: number;
}
