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

export enum WhatsAppAccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNVERIFIED = 'unverified',
}

@Entity('whatsapp_accounts')
@Index(['tenant_id', 'phone_number_id'])
export class WhatsappAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  name: string; // e.g. "مبيعات أمريكا - ديترويت", "الدعم الفني الرئيسي"

  @Column({ type: 'varchar', length: 50 })
  phone_number: string;

  @Column({ type: 'varchar', length: 100 })
  phone_number_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  waba_id: string;

  @Column({ type: 'text' })
  access_token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  app_secret: string;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({
    type: 'enum',
    enum: WhatsAppAccountStatus,
    default: WhatsAppAccountStatus.ACTIVE,
  })
  status: WhatsAppAccountStatus;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
