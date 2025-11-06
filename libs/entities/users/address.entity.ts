import { BinaryUuidColumn } from "libs/shared";
import { Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, OneToOne, Column } from "typeorm";
import { Account, Store } from ".";

@Entity('address')
export class Address {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @ManyToOne(() => Account, (account) => account.addresses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @BinaryUuidColumn({ name: 'account_id', nullable: true })
  accountId: string | null;

  @OneToOne(() => Store, (store) => store.address, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store: Store;

  @BinaryUuidColumn({ name: 'store_id', nullable: true, unique: true })
  storeId: string | null;

  @Column({ type: 'varchar', length: 100 })
  address: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  apartment: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 10 })
  zip: string;

  @Column({ type: 'varchar', length: 100 })
  country: string;
}
