import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class SendWhatsappMessageDto {
  @ApiProperty({
    description: 'رقم هاتف المستلم بالصيغة الدولية (بدون علامة + أو معها)',
    example: '15551234567',
  })
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @IsString()
  @Matches(/^[0-9+]{8,18}$/, { message: 'صيغة رقم الهاتف غير صالحة' })
  to: string;

  @ApiPropertyOptional({
    description: 'نص الرسالة المراد إرسالها (في حال الرسائل النصية)',
    example: 'مرحباً بك في خدمة العملاء',
  })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({
    description: 'نوع الرسالة: نصية أو قالب',
    enum: ['text', 'template'],
    default: 'text',
  })
  @IsOptional()
  @IsString()
  type?: 'text' | 'template';

  @ApiPropertyOptional({
    description: 'اسم القالب المعتمد من Meta (مطلوب إذا كان النوع template)',
    example: 'subscription_renewal_ar',
  })
  @IsOptional()
  @IsString()
  templateName?: string;

  @ApiPropertyOptional({
    description: 'رمز لغة القالب',
    example: 'ar',
    default: 'ar',
  })
  @IsOptional()
  @IsString()
  templateLanguage?: string;
}
