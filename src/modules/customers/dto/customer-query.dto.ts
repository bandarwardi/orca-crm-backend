import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'فلترة حسب المدينة', example: 'Dearborn' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'فلترة حسب المصدر', example: 'referral' })
  @IsOptional()
  @IsString()
  source?: string;
}
