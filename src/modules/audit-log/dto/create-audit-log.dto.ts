import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsEnum, IsString, IsOptional } from 'class-validator';
import { AuditLogAction } from '../entities/audit-log.entity';

export class CreateAuditLogDto {
  @ApiPropertyOptional({ description: 'ID of the user who performed the action' })
  @IsUUID('4')
  @IsOptional()
  user_id?: string;

  @ApiProperty({ enum: AuditLogAction })
  @IsEnum(AuditLogAction)
  @IsNotEmpty()
  action: AuditLogAction;

  @ApiProperty({ description: 'Type of entity modified (e.g. Order, Customer)' })
  @IsString()
  @IsNotEmpty()
  entity_type: string;

  @ApiProperty({ description: 'ID of the entity modified' })
  @IsUUID('4')
  @IsNotEmpty()
  entity_id: string;

  @ApiPropertyOptional({ description: 'Previous state as JSON' })
  @IsOptional()
  old_values?: any;

  @ApiPropertyOptional({ description: 'New state as JSON' })
  @IsOptional()
  new_values?: any;
}
