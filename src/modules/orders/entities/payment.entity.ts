import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Order } from './order.entity';

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  REFUNDED = 'refunded',
  FAILED = 'failed',
}

@Entity('payments')
@Index(['tenant_id', 'order_id'])
@Index(['tenant_id', 'invoice_number'], { unique: true })
export class Payment extends TenantBaseEntity {
  @Column({ type: 'char', length: 36 })
  order_id: string;

  @ManyToOne(() => Order, (order) => order.payments)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'varchar', length: 20 })
  invoice_number: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PAID })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 100 })
  payment_method: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  payment_date: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
