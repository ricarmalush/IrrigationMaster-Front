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
}
