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

// "Cambiar mi contraseña": distinto de resetPassword (un admin reseteando la de otro) -- este
// siempre opera sobre el propio usuario autenticado y exige la contraseña actual.
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}
