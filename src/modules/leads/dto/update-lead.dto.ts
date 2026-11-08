import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateLeadDto } from './create-lead.dto';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
  @ApiPropertyOptional({
    description: 'سبب الإغلاق أو خسارة العميل (في حال تم الإغلاق)',
    example: 'السعر مرتفع مقارنة بالمنافسين',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  close_reason?: string;

  @ApiPropertyOptional({ description: 'اسم العميل' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'رقم الهاتف' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'الولاية أو المنطقة' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional({ description: 'اسم الموظف المسؤول' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  rep_name?: string;
}
