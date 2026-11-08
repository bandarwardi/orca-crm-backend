import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeadNoteType } from '../entities/lead-note.entity';

export class CreateLeadNoteDto {
  @ApiPropertyOptional({
    enum: LeadNoteType,
    default: LeadNoteType.GENERAL,
    description: 'نوع الملاحظة أو النشاط (call, whatsapp, status_change, general)',
    example: LeadNoteType.CALL,
  })
  @IsOptional()
  @IsEnum(LeadNoteType, { message: 'نوع الملاحظة غير صالح' })
  type?: LeadNoteType = LeadNoteType.GENERAL;

  @ApiProperty({
    description: 'محتوى الملاحظة أو تفاصيل الاتصال',
    example: 'تم الاتصال بالعميل وأكد اهتمامه بالقنوات الرياضية والباقة السنوية',
  })
  @IsString({ message: 'محتوى الملاحظة يجب أن يكون نصاً' })
  @IsNotEmpty({ message: 'محتوى الملاحظة مطلوب' })
  content: string;
}
