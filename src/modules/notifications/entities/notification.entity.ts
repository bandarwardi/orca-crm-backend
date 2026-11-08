import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { User } from '../../users/entities/user.entity';

export enum NotificationCategory {
  FOLLOWUP = 'followup',
  EXPIRY = 'expiry',
  MESSAGES = 'messages',
  TASKS = 'tasks',
  SYSTEM = 'system',
}

export enum NotificationStatus {
  READ = 'read',
  UNREAD = 'unread',
}

@Entity('notifications')
@Index(['tenant_id', 'user_id'])
@Index(['tenant_id', 'user_id', 'status'])
export class Notification extends TenantBaseEntity {
  @Column({ type: 'char', length: 36 })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: NotificationCategory, default: NotificationCategory.SYSTEM })
  category: NotificationCategory;

  @Column({ type: 'enum', enum: NotificationStatus, default: NotificationStatus.UNREAD })
  status: NotificationStatus;

  @Column({ type: 'boolean', default: false })
  is_important: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  reference_type: string;

  @Column({ type: 'char', length: 36, nullable: true })
  reference_id: string;
}
