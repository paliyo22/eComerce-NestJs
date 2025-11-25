import { AccountDto } from "libs/dtos/acount";
import { PartialAccountDto } from "libs/dtos/acount/partial-account";


export class AccountOutputDto implements Partial<AccountDto>{

    static fromEntity(account: AccountDto): AccountOutputDto {
        return {
            email: account.email,
            username: account.username,
            meta: account.meta,
            role: account.role,
            userProfile: account.userProfile,
            businessProfile: account.businessProfile,
            adminProfile: account.adminProfile,
            address: account.address,
            store: account.store,
            status: account.status
        };
    }
}

export class PartialAccountOutputDto implements Partial<PartialAccountDto>{

    static fromEntity(account: PartialAccountDto): PartialAccountOutputDto {
        return{
            email: account.email,
            username: account.username,
            role: account.role,
            status: account.status
        }
    }
}