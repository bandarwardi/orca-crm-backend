import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class SendRcSmsDto {
  @ApiProperty({
    description: 'رقم هاتف المستلم بصيغة E.164 (مثال: +14155550199 أو 14155550199)',
    example: '+14155550199',
  })
  @IsNotEmpty({ message: 'رقم هاتف المستلم مطلوب' })
  @IsString()
  @Matches(/^[0-9+]{8,18}$/, { message: 'صيغة رقم الهاتف غير صالحة' })
  to: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف المُرسل المرخص في RingCentral (اختياري - يترك فارغاً للاستخدام الافتراضي للفرع/الحساب)',
    example: '+14155550100',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    description: 'نص الرسالة القصيرة (SMS) بحد أقصى 1000 حرف',
    example: 'مرحباً بك في ORCA IPTV، تفاصيل اشتراكك جاهزة.',
  })
  @IsNotEmpty({ message: 'نص الرسالة مطلوب' })
  @IsString()
  text: string;
}
