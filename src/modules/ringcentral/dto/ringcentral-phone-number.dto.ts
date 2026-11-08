import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateRingcentralPhoneNumberDto {
  @ApiProperty({ description: 'رقم الهاتف بصيغة E.164 (مثال: +15551234567)', example: '+15551234567' })
  @IsString()
  @IsNotEmpty()
  phone_number: string;

  @ApiProperty({ description: 'التسمية التوضيحية للخط (مثال: خط المبيعات الرئيسي)', example: 'خط المبيعات الرئيسي' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({ description: 'القسم التابع له الخط (sales, support, general)', example: 'sales' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'نوع الاستخدام في RingCentral', example: 'CompanyNumber' })
  @IsString()
  @IsOptional()
  usage_type?: string;

  @ApiPropertyOptional({ description: 'رقم التحويلة الداخلية إن وجد', example: '101' })
  @IsString()
  @IsOptional()
  extension_number?: string;

  @ApiPropertyOptional({ description: 'ميزات الخط المتاحة (Voice, SmsSender)', example: ['Voice', 'SmsSender'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ description: 'تعيين كرقم افتراضي للشركة', example: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class UpdateRingcentralPhoneNumberDto {
  @ApiPropertyOptional({ description: 'رقم الهاتف', example: '+15551234567' })
  @IsString()
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ description: 'التسمية التوضيحية للخط', example: 'خط المبيعات الثاني' })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ description: 'القسم التابع له الخط', example: 'sales' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ description: 'رقم التحويلة الداخلية إن وجد', example: '102' })
  @IsString()
  @IsOptional()
  extension_number?: string;

  @ApiPropertyOptional({ description: 'ميزات الخط المتاحة', example: ['Voice', 'SmsSender'] })
  @IsArray()
  @IsOptional()
  features?: string[];

  @ApiPropertyOptional({ description: 'تعيين كرقم افتراضي', example: true })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}
