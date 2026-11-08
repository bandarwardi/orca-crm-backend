import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class LeadSearchDto {
  @ApiProperty({
    description: 'كلمة البحث (اسم العميل، هاتف العميل، بريد العميل، أو الملاحظات)',
    example: 'أحمد خليل',
  })
  @IsString()
  @IsNotEmpty({ message: 'حقل البحث مطلوب' })
  query: string;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لعدد النتائج المسترجعة',
    default: 20,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
