import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Entity, Column, OneToMany, OneToOne, BeforeInsert } from "typeorm";
import { v4 as uuid } from 'uuid';
import { MetaA } from "./metaAEntity";
import { Address } from "./addressEntity";
import { AdminProfile } from "./adminEntity";
import { Balance } from "./balanceEntity";
import { BusinessProfile } from "./businessEntity";
import { RefreshToken } from "./refreshTokenEntity";
import { Store } from "./storeEntity";
import { UserProfile } from "./userEntity";
import { Withdrawal } from "./withdrawalEntity";

@Entity('account')
export class Account {
  constructor(){};
  
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @OneToOne(() => MetaA, (meta) => meta.account)
  meta: MetaA;

  @OneToOne(() => Balance, (balance) => balance.account)
  balance: Balance;  

  @OneToOne(() => UserProfile, (profile) => profile.account)
  userProfile?: UserProfile;

  @OneToOne(() => BusinessProfile, (profile) => profile.account)
  businessProfile?: BusinessProfile;

  @OneToOne(() => AdminProfile, (profile) => profile.account)
  adminProfile?: AdminProfile;

  @OneToMany(() => RefreshToken, (token) => token.account)
  refreshTokens?: RefreshToken[];

  @OneToMany(() => Store, (store) => store.account)
  stores?: Store[];

  @OneToMany(() => Address, (address) => address.account)
  addresses?: Address[];

  @OneToMany(() => Withdrawal, (w) => w.account)
  withdrawal?: Withdrawal[];
}
