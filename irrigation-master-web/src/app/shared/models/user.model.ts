export interface AppUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organizationId: string;
    role: string;
    isActive: boolean;
    fullName: string;
    created: string;
    walkwayId?: string | null;
    walkwayCode?: string | null;
    organizationName: string;
}

export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    organizationId: string;
    roleId: string;
    password: string;
}

export interface UpdateUserRequest {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organizationId: string;
}
