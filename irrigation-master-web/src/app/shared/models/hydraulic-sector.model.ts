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
}
