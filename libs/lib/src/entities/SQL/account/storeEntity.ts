import { Entity, ManyToOne, JoinColumn, Column, OneToOne, BeforeInsert, Index } from "typeorm";
import { v4 as uuid } from 'uuid';
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Account } from "./accountEntity";
import { Address } from "./addressEntity";

@Entity('store')
@Index('idx_account', ['accountId'])
export class Store {
  constructor(){};
  
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

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @OneToOne(() => Address, (address) => address.store)
  address: Address;
}
