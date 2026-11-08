import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ConversationStatus, ConversationChannel } from '../entities/conversation.entity';

export class SearchConversationsDto {
  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  @IsOptional()
  status?: ConversationStatus;

  @ApiPropertyOptional({ enum: ConversationChannel })
  @IsEnum(ConversationChannel)
  @IsOptional()
  channel?: ConversationChannel;

  @ApiPropertyOptional({ description: 'Filter by assigned user' })
  @IsUUID('4')
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Filter by customer' })
  @IsUUID('4')
  @IsOptional()
  customer_id?: string;
}
