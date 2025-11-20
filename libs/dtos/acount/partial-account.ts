import { Account } from "libs/entities/users";
import { ERole } from "libs/shared/role-enum";

export class PartialAccountDto {
    id: string;
    email: string;
    username: string;
    role: ERole;
    status: string;
    refreshToken?: string;

    static fromEntity(account: Account, refreshToken: string): PartialAccountDto {
        return{
            id: account.id,
            email: account.email,
            username: account.username,
            role: account.meta.role.slug as ERole,
            status: account.meta.status.name,
            refreshToken: refreshToken
        }
    }
}