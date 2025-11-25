import { PartialAccountDto } from "libs/dtos/acount";
import { ERole } from "libs/shared/role-enum";

export class AuthDto {
    username: string; 
    role: ERole; 
    status: string;

    static fromEntity(account: PartialAccountDto): AuthDto{
        return {
            username: account.username,
            role: account.role,
            status: account.status
        }
    }
}