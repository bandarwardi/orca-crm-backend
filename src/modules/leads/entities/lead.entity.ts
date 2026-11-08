import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { LeadNote } from './lead-note.entity';

export enum LeadStage {
  NEW = 'new',
  INTERESTED = 'interested',
  NEGOTIATION = 'negotiation',
  CONVERTED = 'converted',
  CLOSED = 'closed',
}

export enum LeadPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('leads')
@Index(['tenant_id', 'stage'])
@Index(['tenant_id', 'assigned_to'])
@Index(['tenant_id', 'customer_id'])
export class Lead extends TenantBaseEntity {
  @Column({ name: 'customer_id', type: 'char', length: 36 })
  customer_id: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'assigned_to', type: 'char', length: 36, nullable: true })
  assigned_to: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedTo: User | null;

  @Column({
    type: 'enum',
    enum: LeadStage,
    default: LeadStage.NEW,
  })
  stage: LeadStage;

  @Column({
    type: 'enum',
    enum: LeadPriority,
    default: LeadPriority.MEDIUM,
  })
  priority: LeadPriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  estimated_value: number | null;

  @Column({ type: 'timestamp', nullable: true })
  follow_up_at: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  close_reason: string | null;

  @OneToMany(() => LeadNote, (note: LeadNote) => note.lead)
  notes: LeadNote[];
}
