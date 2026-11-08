import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CallLogQueryDto {
  @ApiPropertyOptional({
    description: 'تاريخ بداية السجلات (صيغة ISO 8601 مثال: 2026-01-01T00:00:00.000Z)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'تاريخ نهاية السجلات (صيغة ISO 8601)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد السجلات لكل صفحة (الحد الأقصى 250)',
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  perPage?: number = 50;
}
