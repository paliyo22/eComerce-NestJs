import { ERole } from "../../../enums/ERole";
import { PartialAccountDto } from "../../events/account/partialAccountDto";

export class AuthDto {
    email: string;
    username: string; 
    role: ERole; 
    status: string;

    constructor(account: PartialAccountDto){
        this.username = account.username;
        this.role = account.role;
        this.status = account.status;
    };
}