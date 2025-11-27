import { PrimaryBinaryUuidColumn, BinaryUuidColumn } from "libs/shared";
import { Entity, ManyToOne, JoinColumn, Column, OneToOne, BeforeInsert } from "typeorm";
import { Account, Address } from ".";
import { v4 as uuid } from 'uuid';

@Entity('store')
export class Store {
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @ManyToOne(() => Account, (account) => account.stores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @OneToOne(() => Address, (address) => address.store)
  address: Address;
}
