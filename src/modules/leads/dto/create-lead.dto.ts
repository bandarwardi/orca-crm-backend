import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { LeadPriority, LeadStage } from '../entities/lead.entity';

export class CreateLeadDto {
  @ApiProperty({
    description: 'معرف العميل (UUID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'معرف العميل غير صالح' })
  @IsNotEmpty({ message: 'معرف العميل مطلوب' })
  customer_id: string;

  @ApiPropertyOptional({
    description: 'معرف الموظف المسؤول (UUID)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4', { message: 'معرف الموظف غير صالح' })
  assigned_to?: string;

  @ApiPropertyOptional({
    enum: LeadStage,
    default: LeadStage.NEW,
    description: 'مرحلة العميل المحتمل',
  })
  @IsOptional()
  @IsEnum(LeadStage, { message: 'المرحلة المحددة غير صالحة' })
  stage?: LeadStage = LeadStage.NEW;

  @ApiPropertyOptional({
    enum: LeadPriority,
    default: LeadPriority.MEDIUM,
    description: 'أولوية المتابعة',
  })
  @IsOptional()
  @IsEnum(LeadPriority, { message: 'الأولوية المحددة غير صالحة' })
  priority?: LeadPriority = LeadPriority.MEDIUM;

  @ApiPropertyOptional({
    description: 'مصدر العميل (facebook, referral, whatsapp...)',
    example: 'إعلان فيسبوك',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @ApiPropertyOptional({
    description: 'القيمة المالية المتوقعة للاشتراك',
    example: 120.0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'القيمة المتوقعة يجب أن تكون رقماً' })
  estimated_value?: number;

  @ApiPropertyOptional({
    description: 'موعد وتاريخ المتابعة القادمة (ISO Date)',
    example: '2026-10-01T14:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'تاريخ المتابعة يجب أن يكون بصيغة ISO صالحة' })
  follow_up_at?: string;

  @ApiPropertyOptional({
    description: 'ملاحظة أولية تُضاف تلقائياً إلى الـ Timeline',
    example: 'طلب تجربة مجانية على شاشتين',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
