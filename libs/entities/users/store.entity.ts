import { PrimaryBinaryUuidColumn, BinaryUuidColumn } from "libs/shared";
import { Entity, ManyToOne, JoinColumn, Column, OneToOne } from "typeorm";
import { Account, Address } from ".";

@Entity('store')
export class Store {
  @PrimaryBinaryUuidColumn()
  id: string;

  @ManyToOne(() => Account, (account) => account.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @OneToOne(() => Address, (address) => address.store)
  address: Address;
}
