import { Entity, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne, Column } from "typeorm";
import { Product } from "./product.entity";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";

@Entity('meta')
export class Meta {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @OneToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'datetime', nullable: true })
  deleted: Date;
    
  @BinaryUuidColumn({ name: 'deleted_by'})
  deletedBy: string;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;
}