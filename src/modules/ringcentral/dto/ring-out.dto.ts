import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class RingOutDto {
  @ApiProperty({
    description: 'رقم هاتف العميل المطلوب الاتصال به',
    example: '+14155550199',
  })
  @IsNotEmpty({ message: 'رقم هاتف الوجهة مطلوب' })
  @IsString()
  @Matches(/^[0-9+]{8,18}$/, { message: 'صيغة رقم الهاتف غير صالحة' })
  toNumber: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف الموظف أو رقم التحويلة (في حال الرغبة برن هاتف محدد أولاً)',
    example: '+14155550123',
  })
  @IsOptional()
  @IsString()
  fromNumber?: string;

  @ApiPropertyOptional({
    description: 'رقم هوية المتصل المعروض للعميل (Caller ID)',
    example: '+14155550100',
  })
  @IsOptional()
  @IsString()
  callerId?: string;
}
