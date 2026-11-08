import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { LeadPriority, LeadStage } from '../entities/lead.entity';

export class LeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: LeadStage,
    description: 'فلترة حسب المرحلة (Kanban stage)',
  })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({
    description: 'فلترة حسب الموظف المسؤول (UUID)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4')
  assigned_to?: string;

  @ApiPropertyOptional({
    enum: LeadPriority,
    description: 'فلترة حسب الأولوية',
  })
  @IsOptional()
  @IsEnum(LeadPriority)
  priority?: LeadPriority;

  @ApiPropertyOptional({
    description: 'فلترة حسب المصدر',
    example: 'إعلان فيسبوك',
  })
  @IsOptional()
  @IsString()
  source?: string;
}
