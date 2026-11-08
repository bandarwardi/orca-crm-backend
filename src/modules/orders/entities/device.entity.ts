import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from './order.entity';

export enum DeviceType {
  SMART_TV = 'smart_tv',
  ANDROID_BOX = 'android_box',
  MOBILE = 'mobile',
  PC = 'pc',
  FIRESTICK = 'firestick',
  APPLE_TV = 'apple_tv',
  MAG = 'mag',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  SUSPENDED = 'suspended',
}

@Entity('devices')
@Index(['tenant_id', 'order_id'])
@Index(['tenant_id', 'mac_address'])
export class Device extends TenantBaseEntity {
  @Column({ type: 'char', length: 36 })
  order_id: string;

  @ManyToOne(() => Order, (order) => order.devices)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ type: 'char', length: 36 })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: DeviceType })
  device_type: DeviceType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  device_type_name: string;

  @Column({ type: 'varchar', length: 17 })
  mac_address: string; // SENSITIVE

  @Column({ type: 'varchar', length: 50 })
  device_key: string; // SENSITIVE

  @Column({ type: 'varchar', length: 100 })
  username: string; // SENSITIVE

  @Column({ type: 'varchar', length: 100, nullable: true })
  app_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  quality_tag: string;

  @Column({ type: 'enum', enum: DeviceStatus, default: DeviceStatus.ACTIVE })
  status: DeviceStatus;
}
