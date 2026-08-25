// Espejo de LicenceTypeResponseDto. Catalogo global, no multi-tenant -- de lectura abierta a
// cualquier autenticado, escritura (Create/Update/Delete) exclusiva de SUPERADMIN.
// Espejo de SystemLevel (backend): serializado como string via JsonStringEnumConverter.
export type SystemLevel = 'Core' | 'Structure' | 'Planning' | 'Operational' | 'Administrative';

export interface LicenceType {
    id: string;
    name: string;
    licenseCode: string;
    description: string;
    durationInDays: number;
    priceAmount: number;
    priceCurrency: string;
    isUsageBased: boolean;
    maxLevelAllowed: SystemLevel;
    isDeleted: boolean;
    created: string;
}

export interface CreateLicenceTypeRequest {
    name: string;
    licenseCode: string;
    description: string;
    durationInDays: number;
    priceAmount: number;
    priceCurrency: string;
    isUsageBased: boolean;
    maxLevelAllowed: SystemLevel;
}

export interface UpdateLicenceTypeRequest extends CreateLicenceTypeRequest {
    id: string;
}
