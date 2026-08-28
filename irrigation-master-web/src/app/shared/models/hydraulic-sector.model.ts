export interface HydraulicSector {
    id: string;
    name: string;
    areaSize: number;
    organizationId: string;
    isDeleted: boolean;
}

export interface CreateHydraulicSectorRequest {
    name: string;
    areaSize: number;
    organizationId?: string;
}

export interface UpdateHydraulicSectorRequest {
    id: string;
    name: string;
    areaSize: number;
    // Opcional. Solo tiene efecto para SUPERADMIN (organización real del sector, preservada tal
    // cual venía del GET -- no es editable desde este formulario, solo se reenvía intacta para que
    // el backend pueda localizar el registro cuando es de una organización distinta a la suya).
    organizationId?: string;
}
