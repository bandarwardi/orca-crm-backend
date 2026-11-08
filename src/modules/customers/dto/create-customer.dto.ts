import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: 'اسم العميل الكامل', example: 'محمد علي' })
  @IsString()
  @IsNotEmpty({ message: 'اسم العميل مطلوب' })
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'رقم هاتف العميل', example: '+13135550199' })
  @IsString()
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @MaxLength(50)
  phone: string;

  @ApiPropertyOptional({ description: 'البريد الإلكتروني', example: 'mohammed@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'صيغة البريد الإلكتروني غير صالحة' })
  @MaxLength(255)
  email?: string;

  @ApiProperty({ description: 'المدينة', example: 'Dearborn' })
  @IsString()
  @IsNotEmpty({ message: 'المدينة مطلوبة' })
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ description: 'الولاية', example: 'MI', default: 'MI' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  state?: string;

  @ApiPropertyOptional({ description: 'العنوان بالتفصيل', example: '13600 Michigan Ave, Dearborn, MI 48126' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'خط العرض الجغرافي', example: 42.3223 })
  @IsOptional()
  @IsNumber({}, { message: 'خط العرض يجب أن يكون رقماً' })
  lat?: number;

  @ApiPropertyOptional({ description: 'خط الطول الجغرافي', example: -83.1763 })
  @IsOptional()
  @IsNumber({}, { message: 'خط الطول يجب أن يكون رقماً' })
  lng?: number;

  @ApiPropertyOptional({ description: 'مصدر العميل (referral, facebook, direct...)', example: 'referral' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
