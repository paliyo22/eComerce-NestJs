import { ERole } from "@app/lib";

export interface JwtPayload {
    accountId: string;
    email: string;
    role: ERole;
}