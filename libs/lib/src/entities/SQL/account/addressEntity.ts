import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { Entity, ManyToOne, JoinColumn, OneToOne, Column, BeforeInsert, Index, Check } from "typeorm";
import { v4 as uuid } from 'uuid';
import { Account } from "./accountEntity";
import { Store } from "./storeEntity";

@Entity('address')
@Check(`(account_id IS NOT NULL AND store_id IS NULL) OR (account_id IS NULL AND store_id IS NOT NULL)`)
@Index(['country', 'city'])
@Index('idx_account', ['accountId'])
export class Address {
  constructor(){};
  
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @ManyToOne(() => Account, (account) => account.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @OneToOne(() => Store, (store) => store.address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store?: Store;

  @BinaryUuidColumn({ name: 'store_id', nullable: true, unique: true })
  storeId: string | null;

  @Column({ type: 'varchar', length: 100 })
  address: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  apartment: string | null;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 10 })
  zip: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;
}
