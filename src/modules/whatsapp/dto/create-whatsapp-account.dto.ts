import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { WhatsAppAccountStatus } from '../entities/whatsapp-account.entity';

export class CreateWhatsappAccountDto {
  @ApiProperty({
    description: 'اسم الحساب / التسمية (مثال: مبيعات ديترويت، الدعم الفني)',
    example: 'مبيعات ديترويت',
  })
  @IsNotEmpty({ message: 'اسم الحساب مطلوب' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'رقم الهاتف الفعلي المسجل في واتساب',
    example: '+13135550192',
  })
  @IsNotEmpty({ message: 'رقم الهاتف مطلوب' })
  @IsString()
  phone_number: string;

  @ApiProperty({
    description: 'معرف رقم الهاتف من Meta (Phone Number ID)',
    example: '109823482349823',
  })
  @IsNotEmpty({ message: 'Phone Number ID مطلوب' })
  @IsString()
  phone_number_id: string;

  @ApiPropertyOptional({
    description: 'معرف حساب واتساب التجاري (WABA ID)',
    example: '98234723948234',
  })
  @IsOptional()
  @IsString()
  waba_id?: string;

  @ApiProperty({
    description: 'رمز الوصول الدائم (Permanent Access Token)',
  })
  @IsNotEmpty({ message: 'Access Token مطلوب' })
  @IsString()
  access_token: string;

  @ApiPropertyOptional({
    description: 'سر التطبيق (App Secret) للتحقق من توقيع الـ Webhook',
  })
  @IsOptional()
  @IsString()
  app_secret?: string;

  @ApiPropertyOptional({
    description: 'هل هذا الرقم هو الافتراضي للإرسال التلقائي؟',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'حالة الحساب',
    enum: WhatsAppAccountStatus,
    default: WhatsAppAccountStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(WhatsAppAccountStatus)
  status?: WhatsAppAccountStatus;
}
