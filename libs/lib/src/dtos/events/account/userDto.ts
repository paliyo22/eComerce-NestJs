import { UserProfile } from '../../../entities/SQL/account/userEntity';

export class UserProfileDto {
    firstname: string;
    lastname: string;
    birth?: Date;
    phone?: string;
    cbu?: string;

    constructor(user: UserProfile){
        this.firstname = user.firstname;
        this.lastname = user.lastname;
        this.birth = new Date(user.birth) ?? undefined;
        this.phone = user.phone ?? undefined;
        this.cbu = user.cbu ?? undefined;
    };
}