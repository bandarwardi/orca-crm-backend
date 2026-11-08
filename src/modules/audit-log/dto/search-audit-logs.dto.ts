import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { AuditLogAction } from '../entities/audit-log.entity';

export class SearchAuditLogsDto {
  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsUUID('4')
  @IsOptional()
  user_id?: string;

  @ApiPropertyOptional({ enum: AuditLogAction, description: 'Filter by action type' })
  @IsEnum(AuditLogAction)
  @IsOptional()
  action?: AuditLogAction;

  @ApiPropertyOptional({ description: 'Filter by entity type' })
  @IsString()
  @IsOptional()
  entity_type?: string;

  @ApiPropertyOptional({ description: 'Filter by entity ID' })
  @IsUUID('4')
  @IsOptional()
  entity_id?: string;
}
