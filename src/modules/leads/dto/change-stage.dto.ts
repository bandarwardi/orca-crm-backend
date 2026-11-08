import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadStage } from '../entities/lead.entity';

export class ChangeLeadStageDto {
  @ApiProperty({
    enum: LeadStage,
    description: 'المرحلة الجديدة في مسار المبيعات (Kanban stage)',
    example: LeadStage.NEGOTIATION,
  })
  @IsEnum(LeadStage, { message: 'المرحلة المحددة غير صالحة' })
  @IsNotEmpty({ message: 'المرحلة مطلوبة' })
  stage: LeadStage;

  @ApiPropertyOptional({
    description: 'سبب الإغلاق أو الخسارة (إذا تم الإغلاق)',
    example: 'تم التحويل إلى مشترك بنجاح',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  close_reason?: string;

  @ApiPropertyOptional({
    description: 'ملاحظة إضافية تظهر في الخط الزمني (Timeline) حول سبب النقل',
    example: 'تم التواصل هاتفياً وإرسال كود التجربة المجانية',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
