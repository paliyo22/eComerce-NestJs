import { BinaryUuidColumn, PrimaryBinaryUuidColumn } from "libs/shared";
import { CreateDateColumn, Entity, OneToMany, UpdateDateColumn } from "typeorm";
import { CartProduct } from "./cart-product";

@Entity('cart')
export class Cart {
  @PrimaryBinaryUuidColumn()
  id?: string;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;

  @OneToMany(() => CartProduct, (cp) => cp.cart, { cascade: false })
  cartProducts: CartProduct[];
}