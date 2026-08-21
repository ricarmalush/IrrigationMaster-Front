// Espejo de LicenceTypeResponseDto. Catalogo global, no multi-tenant -- de solo lectura para
// cualquier autenticado (la escritura es SUPERADMIN-only, pero no la necesitamos aqui: solo
// resolvemos nombres y alimentamos el selector de "Asignar licencia").
export interface LicenceType {
    id: string;
    name: string;
    licenseCode: string;
    description: string;
    durationInDays: number;
    priceAmount: number;
    priceCurrency: string;
    isUsageBased: boolean;
    maxLevelAllowed: string;
    isDeleted: boolean;
    created: string;
}
