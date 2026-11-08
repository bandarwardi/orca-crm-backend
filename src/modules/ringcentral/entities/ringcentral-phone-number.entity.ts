import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

@Entity('ringcentral_phone_numbers')
@Index(['tenant_id', 'phone_number'], { unique: true })
export class RingcentralPhoneNumber {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 50 })
  phone_number: string;

  @Column({ type: 'varchar', length: 150 })
  label: string;

  @Column({ type: 'varchar', length: 50, default: 'sales' })
  department: string; // 'sales' | 'support' | 'general'

  @Column({ type: 'varchar', length: 50, nullable: true })
  usage_type: string; // 'CompanyNumber' | 'DirectNumber' | 'MainCompanyNumber'

  @Column({ type: 'varchar', length: 20, nullable: true })
  extension_number: string;

  @Column({ type: 'simple-array', nullable: true })
  features: string[]; // ['Voice', 'SmsSender', 'CallerId']

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
