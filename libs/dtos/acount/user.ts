import { UserProfile } from "libs/entities/users";

export class UserProfileDto {
    firstname: string;
    lastname: string;
    birth: Date | null;
    phone: string | null;

    static fromEntity(user: UserProfile): UserProfileDto {
        return {
            firstname: user.firstname,
            lastname: user.lastname,
            birth: user.birth,
            phone: user.phone
        };
    }
}