import { ERole } from '../../../enums/ERole';
import { Account } from '../../../entities/SQL/account/accountEntity';

export class PartialAccountDto {
    id: string;
    email: string;
    username: string;
    role: ERole;
    status: string;
    refreshToken?: string;

    constructor(account: Account, refreshToken?: string){
        this.id = account.id;
        this.email = account.email;
        this.username = account.username;
        this.role = account.meta.role.slug as ERole;
        this.status = account.meta.status.slug;
        this.refreshToken = refreshToken;
    }
}