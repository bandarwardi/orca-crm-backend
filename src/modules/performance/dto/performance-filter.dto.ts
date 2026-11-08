import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsUUID } from 'class-validator';

export class PerformanceFilterDto {
  @ApiPropertyOptional({ description: 'Start date for filtering KPIs' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for filtering KPIs' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by specific user (for supervisors)' })
  @IsUUID('4')
  @IsOptional()
  user_id?: string;
}
