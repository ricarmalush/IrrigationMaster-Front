export interface Address {
    mainAddress: string;
    city: string;
    stateOrProvince: string;
    postalCode: string;
    countryId: string;
    locationDetail?: string;
}

export interface Organization {
    id: string;
    name: string;
    taxId: string;
    address: Address;
    isActive: boolean;
    created: string;
    createdBy: string;
    invitationCode: string;
}

export interface CreateOrganizationRequest {
    name: string;
    taxId: string;
    address: Address;
}

export interface UpdateOrganizationRequest {
    id: string;
    name: string;
    taxId: string;
    address: Address;
}
