import { Account } from "./accountEntity";
import { Address } from "./addressEntity";
import { AdminProfile } from "./adminEntity";
import { Balance } from "./balanceEntity";
import { BusinessProfile } from "./businessEntity";
import { MetaA } from "./metaAEntity";
import { RefreshToken } from "./refreshTokenEntity";
import { Role } from "./roleEntity";
import { Status } from "./statusEntity";
import { Store } from "./storeEntity";
import { UserProfile } from "./userEntity";
import { Withdrawal } from "./withdrawalEntity";

export const accountEntities = [
    Account,
    Address,
    AdminProfile,
    BusinessProfile,
    MetaA,
    RefreshToken,
    Role,
    Status,
    Store,
    UserProfile,
    Balance,
    Withdrawal
]