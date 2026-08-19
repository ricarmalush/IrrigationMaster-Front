// Espejo TS del contrato Response<T>/ResponsePagination<T> del backend
// (IrrigationMaster.Transversal.Common) -- mismo shape para las 200+ respuestas de la API.

export interface ApiError {
    propertyMessage: string;
    errorMessage: string;
}

export interface ApiResponse<T> {
    data: T;
    isSuccess: boolean;
    message: string;
    errors?: ApiError[] | null;
}

export interface PagedApiResponse<T> extends ApiResponse<T[]> {
    pageNumber: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
}
