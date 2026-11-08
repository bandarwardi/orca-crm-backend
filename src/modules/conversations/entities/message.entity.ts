import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { Conversation } from './conversation.entity';

export enum SenderType {
  CUSTOMER = 'customer',
  USER = 'user',
  SYSTEM = 'system',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['tenant_id', 'conversation_id'])
export class Message extends TenantBaseEntity {
  @Column({ type: 'char', length: 36 })
  conversation_id: string;

  @ManyToOne(() => Conversation, (conv) => conv.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'enum', enum: SenderType })
  sender_type: SenderType;

  @Column({ type: 'char', length: 36, nullable: true })
  sender_id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.SENT })
  status: MessageStatus;
}
