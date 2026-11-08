import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetStatusDto {
  @ApiProperty({ description: 'Whether the user is active' })
  @IsBoolean()
  @IsNotEmpty()
  is_active: boolean;
}
