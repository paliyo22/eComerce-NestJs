export interface SuccessDto <T> {
    success: boolean;
    data?: T;
    message?: string;
}