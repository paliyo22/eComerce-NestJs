import { AdminProfile } from "libs/entities/users";

export class AdminProfileDto {
    publicName: string;

    static fromEntity(admin: AdminProfile): AdminProfileDto {
        return {
            publicName: admin.publicName
        };
    }
}