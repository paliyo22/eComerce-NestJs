import { Entity, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn, 
  OneToOne, Column, Index, UpdateDateColumn } from "typeorm";
import { BinaryUuidColumn } from "../../../shared/binaryUuid.decorator";
import { Product } from "./productEntity";

@Entity('meta')
@Index('idx_account', ['accountId'])
@Index('idx_deleted', ['deleted'])
export class MetaP {
  constructor(){};
  
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @BinaryUuidColumn({ name: 'product_id' })
  productId: string;

  @BinaryUuidColumn({ name: 'account_id' })
  accountId: string;
  
  @OneToOne(() => Product, (product) => product.meta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'datetime', nullable: true })
  deleted: Date | null;

  @BinaryUuidColumn({ name: 'deleted_by', nullable: true })
  deletedBy: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;
}
