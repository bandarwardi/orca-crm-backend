import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Conversation } from './conversation.entity';

export enum MessageDirection {
  INBOUND = 'inbound', // From Customer
  OUTBOUND = 'outbound', // To Customer
}

export enum MessageContentType {
  TEXT = 'text',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  TEMPLATE = 'template',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Entity('messages')
@Index(['tenant_id', 'conversation_id'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenant_id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'uuid' })
  conversation_id: string;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ type: 'enum', enum: MessageDirection })
  direction: MessageDirection;

  @Column({
    type: 'enum',
    enum: MessageContentType,
    default: MessageContentType.TEXT,
  })
  content_type: MessageContentType;

  @Column({ type: 'text' })
  content: string; // The text content or URL for media

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  whatsapp_message_id: string;

  @CreateDateColumn()
  created_at: Date;
}
