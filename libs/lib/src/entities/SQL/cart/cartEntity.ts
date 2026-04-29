import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { PrimaryBinaryUuidColumn } from "../../../shared/primariBinary.decorator";
import { BeforeInsert, CreateDateColumn, Entity, OneToMany, Column } from "typeorm";
import { v4 as uuid } from 'uuid';
import { CartProduct } from "./cartProductEntity";

@Entity('cart')
export class Cart {
  constructor(){};
  
  @PrimaryBinaryUuidColumn()
  id: string;
  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid();
    }
  }

  @BinaryUuidColumn({ name: 'account_id', unique: true })
  accountId: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @Column({ type: 'timestamp' })
  updated: Date;

  @OneToMany(() => CartProduct, (cp) => cp.cart, { cascade: false })
  cartProducts: CartProduct[];
}