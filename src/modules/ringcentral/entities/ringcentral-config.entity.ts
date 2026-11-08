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

export enum RingcentralStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

@Entity('ringcentral_configs')
@Index(['tenant_id'], { unique: true })
export class RingcentralConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 255, default: 'https://platform.ringcentral.com' })
  server_url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  client_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  client_secret: string;

  @Column({ type: 'text', nullable: true })
  jwt_token: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  main_phone_number: string;

  @Column({ type: 'varchar', length: 255, nullable: true, default: 'orca_rc_verify_token_123' })
  webhook_verify_token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  webhook_subscription_id: string;

  @Column({ type: 'boolean', default: false })
  is_enabled: boolean;

  @Column({
    type: 'enum',
    enum: RingcentralStatus,
    default: RingcentralStatus.INACTIVE,
  })
  status: RingcentralStatus;

  @Column({ type: 'timestamp', nullable: true })
  last_tested_at: Date | null;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
