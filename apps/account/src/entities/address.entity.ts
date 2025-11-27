import { BinaryUuidColumn, PrimaryBinaryUuidColumn } from "libs/shared";
import { Entity, ManyToOne, JoinColumn, OneToOne, Column, BeforeInsert } from "typeorm";
import { Account, Store } from ".";
import { v4 as uuid } from 'uuid';

@Entity('address')
export class Address {
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
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @OneToOne(() => Store, (store) => store.address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @BinaryUuidColumn({ name: 'store_id', nullable: true})
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
