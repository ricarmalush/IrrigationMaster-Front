export interface Walkway {
    id: string;
    code: string;
    length: number;
    hydraulicSectorId: string;
    organizationId: string;
    isActive: boolean;
    created: string;
}

export interface CreateWalkwayRequest {
    code: string;
    length: number;
    hydraulicSectorId: string;
    organizationId?: string;
}

export interface UpdateWalkwayRequest {
    code: string;
    length: number;
    // Opcional. Solo tiene efecto para SUPERADMIN (organización real del andador, preservada tal
    // cual venía del GET -- no es editable desde este formulario, solo se reenvía intacta para que
    // el backend pueda localizar el registro cuando es de una organización distinta a la suya).
    organizationId?: string;
}
