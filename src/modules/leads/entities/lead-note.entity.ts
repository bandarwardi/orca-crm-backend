import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Lead } from './lead.entity';
import { User } from '../../users/entities/user.entity';

export enum LeadNoteType {
  CALL = 'call',
  WHATSAPP = 'whatsapp',
  STATUS_CHANGE = 'status_change',
  GENERAL = 'general',
}

@Entity('lead_notes')
@Index(['tenant_id', 'lead_id'])
export class LeadNote extends TenantBaseEntity {
  @Column({ name: 'lead_id', type: 'char', length: 36 })
  lead_id: string;

  @ManyToOne(() => Lead, (lead) => lead.notes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ name: 'author_id', type: 'char', length: 36, nullable: true })
  author_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'author_id' })
  author: User | null;

  @Column({
    type: 'enum',
    enum: LeadNoteType,
    default: LeadNoteType.GENERAL,
  })
  type: LeadNoteType;

  @Column({ type: 'text' })
  content: string;
}
