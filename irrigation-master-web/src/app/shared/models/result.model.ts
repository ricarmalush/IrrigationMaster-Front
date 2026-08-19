// Formas de resultado normalizadas que exponen los servicios de dominio: nunca lanzan, siempre
// isSuccess + message (real del backend o de respaldo) -- mismo patrón que AuthService.login().

export interface OperationResult<TData = void> {
    isSuccess: boolean;
    message: string;
    data?: TData;
}

export interface DetailResult<T> {
    isSuccess: boolean;
    message: string;
    data?: T;
}

export interface ListResult<T> {
    isSuccess: boolean;
    message: string;
    items: T[];
    totalCount: number;
}
