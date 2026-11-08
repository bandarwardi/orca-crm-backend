import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/tenant-base.entity';
import { User } from '../../users/entities/user.entity';

export enum AuditLogAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('audit_logs')
@Index(['tenant_id', 'entity_type', 'entity_id'])
@Index(['tenant_id', 'user_id'])
export class AuditLog extends TenantBaseEntity {
  @Column({ type: 'char', length: 36, nullable: true })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'enum', enum: AuditLogAction })
  action: AuditLogAction;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string;

  @Column({ type: 'char', length: 36 })
  entity_id: string;

  @Column({ type: 'json', nullable: true })
  old_values: any;

  @Column({ type: 'json', nullable: true })
  new_values: any;
}
