import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CustomerSearchDto {
  @ApiProperty({
    description: 'كلمة البحث (يمكن أن تكون اسماً أو رقم هاتف أو بريداً إلكترونياً أو عنواناً)',
    example: '+13135550199',
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
