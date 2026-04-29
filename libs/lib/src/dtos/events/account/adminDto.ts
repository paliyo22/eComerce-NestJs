import { AdminProfile } from '../../../entities/SQL/account/adminEntity';

export class AdminProfileDto {
    publicName: string;

    constructor(admin: AdminProfile){
        this.publicName= admin.publicName;
    };
}