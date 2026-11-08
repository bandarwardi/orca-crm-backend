import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsUUID, IsOptional } from 'class-validator';
import { SenderType } from '../entities/message.entity';

export class SendMessageDto {
  @ApiProperty({ enum: SenderType })
  @IsEnum(SenderType)
  @IsNotEmpty()
  sender_type: SenderType;

  @ApiPropertyOptional({ description: 'ID of the user or customer sending the message' })
  @IsUUID('4')
  @IsOptional()
  sender_id?: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
