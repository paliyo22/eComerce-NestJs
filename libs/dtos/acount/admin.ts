import { AdminProfile } from "apps/account/src/entities";

export class AdminProfileDto {
    publicName: string;

    static fromEntity(admin: AdminProfile): AdminProfileDto {
        return {
            publicName: admin.publicName
        };
    }
}