import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Lead } from '../../leads/entities/lead.entity';
import { User } from '../../users/entities/user.entity';
import { Device } from './device.entity';
import { Payment } from './payment.entity';

export enum OrderStatus {
  ACTIVE = 'active',
  EXPIRING = 'expiring',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Index(['tenant_id', 'status'])
@Index(['tenant_id', 'customer_id'])
@Index(['tenant_id', 'order_number'], { unique: true })
export class Order extends TenantBaseEntity {
  @Column({ type: 'varchar', length: 20 })
  order_number: string;

  @Column({ type: 'char', length: 36 })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'char', length: 36, nullable: true })
  lead_id: string;

  @ManyToOne(() => Lead)
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'char', length: 36, nullable: true })
  assigned_to: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @Column({ type: 'varchar', length: 255, nullable: true })
  package_name: string;

  @Column({ type: 'int' })
  duration_months: number;

  @Column({ type: 'int', default: 1 })
  allowed_devices: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_method: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  server_name: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.ACTIVE })
  status: OrderStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  starts_at: Date;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => Device, (device) => device.order)
  devices: Device[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];
}
