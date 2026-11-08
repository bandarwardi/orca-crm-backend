import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({ description: 'Filter dashboard by a specific user (for supervisors)' })
  @IsUUID('4')
  @IsOptional()
  user_id?: string;
}
