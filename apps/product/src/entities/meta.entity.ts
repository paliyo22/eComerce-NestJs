import { Entity, PrimaryGeneratedColumn, JoinColumn, CreateDateColumn, UpdateDateColumn, OneToOne, Column } from "typeorm";
import { Product } from "./product.entity";
import { BinaryUuidColumn } from "libs/shared/binary-uuid.decorator";

@Entity('meta')
export class Meta {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @OneToOne(() => Product, (product) => product.meta, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' }) // usa EXISTENTE
  product: Product;

  @Column({ type: 'datetime', nullable: true })
  deleted?: Date | null;

  @BinaryUuidColumn({ name: 'deleted_by', nullable: true })
  deletedBy?: string | null;

  @CreateDateColumn({ type: 'datetime' })
  created: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated: Date;
}
