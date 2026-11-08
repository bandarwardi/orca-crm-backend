import { Entity, Column, Index, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

export enum ConversationChannel {
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
  RINGCENTRAL = 'ringcentral',
  EMAIL = 'email',
}

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  PENDING = 'pending',
}

@Entity('conversations')
@Index(['tenant_id', 'customer_id'])
@Index(['tenant_id', 'assigned_to'])
@Index(['tenant_id', 'status'])
export class Conversation extends TenantBaseEntity {
  @Column({ type: 'char', length: 36 })
  customer_id: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ type: 'enum', enum: ConversationChannel })
  channel: ConversationChannel;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.OPEN })
  status: ConversationStatus;

  @Column({ type: 'char', length: 36, nullable: true })
  assigned_to: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_to' })
  assignedUser: User;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_message_at: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
