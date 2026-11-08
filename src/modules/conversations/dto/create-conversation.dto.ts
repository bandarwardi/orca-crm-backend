import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ConversationChannel } from '../entities/conversation.entity';

export class CreateConversationDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsUUID('4')
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({ enum: ConversationChannel })
  @IsEnum(ConversationChannel)
  @IsNotEmpty()
  channel: ConversationChannel;

  @ApiPropertyOptional({ description: 'User ID assigned to this conversation' })
  @IsUUID('4')
  @IsOptional()
  assigned_to?: string;
}
