import { BinaryUuidColumn, PrimaryBinaryUuidColumn } from "libs/shared";
import { BeforeInsert, CreateDateColumn, Entity, OneToMany, UpdateDateColumn } from "typeorm";
import { CartProduct } from "./cart-product";
import { v4 as uuid } from 'uuid';

@Entity('cart')
export class Cart {
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;

  @OneToMany(() => CartProduct, (cp) => cp.cart, { cascade: false })
  cartProducts: CartProduct[];
}