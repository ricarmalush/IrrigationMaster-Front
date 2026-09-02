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
    // Distinto de "pendiente de aprobación" (nunca se activó): DeactivatedAt no-null significa que
    // un admin lo suspendió deliberadamente (reversible con Activate). Ambos casos comparten
    // isActive:false, así que solo DeactivatedAt permite diferenciarlos en la UI.
    deactivatedAt?: string | null;
    deactivatedBy?: string | null;
    // Dirección: ambos opcionales (no todos los usuarios la necesitan, p. ej. Presidente/SUPERADMIN).
    // HouseNumber también alimenta el orden de prioridad de turnos de riego por andador.
    street?: string | null;
    houseNumber?: number | null;
}

export interface CreateUserRequest {
    firstName: string;
    lastName: string;
    email: string;
    organizationId: string;
    roleId: string;
    password: string;
    street?: string | null;
    houseNumber?: number | null;
}

export interface UpdateUserRequest {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    organizationId: string;
    street?: string | null;
    houseNumber?: number | null;
}

// "Cambiar mi contraseña": distinto de resetPassword (un admin reseteando la de otro) -- este
// siempre opera sobre el propio usuario autenticado y exige la contraseña actual.
export interface ChangePasswordRequest {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
}
