import { EAccountStatus } from "../../../enums/EAccountStatus";
import { Account } from "../../../entities/SQL/account/accountEntity";
import { ERole } from "../../../enums/ERole";


export class PartialAccountOutputDto {
    email: string;
    username: string;
    role: ERole;
    status: EAccountStatus;

    constructor(account: Account){
        this.email = account.email;
        this.username = account.username;
        this.role = account.meta.role.slug;
        this.status = account.meta.status.slug;
    };
}