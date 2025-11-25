import { PrimaryBinaryUuidColumn } from "libs/shared";
import { Entity, Column, OneToMany, OneToOne } from "typeorm";
import { Meta, Address, AdminProfile, BusinessProfile, RefreshToken, Store, UserProfile } from ".";

@Entity('account')
export class Account {
  @PrimaryBinaryUuidColumn()
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @OneToOne(() => Meta, (meta) => meta.account)
  meta: Meta;

  @OneToOne(() => UserProfile, (profile) => profile.account)
  userProfile: UserProfile;

  @OneToOne(() => BusinessProfile, (profile) => profile.account)
  businessProfile: BusinessProfile;

  @OneToOne(() => AdminProfile, (profile) => profile.account)
  adminProfile: AdminProfile;

  @OneToMany(() => RefreshToken, (token) => token.account)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Store, (store) => store.account)
  stores: Store[];

  @OneToMany(() => Address, (address) => address.account)
  addresses: Address[];
}
