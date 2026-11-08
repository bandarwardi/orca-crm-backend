import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TestConnectionDto {
  @ApiProperty({
    description: 'معرف رقم الهاتف المراد اختباره من Meta',
    example: '109823482349823',
  })
  @IsNotEmpty({ message: 'Phone Number ID مطلوب' })
  @IsString()
  phone_number_id: string;

  @ApiProperty({
    description: 'رمز الوصول المراد اختباره (Access Token)',
  })
  @IsNotEmpty({ message: 'Access Token مطلوب' })
  @IsString()
  access_token: string;
}
