import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SearchConversationsDto } from './dto/search-conversations.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search and filter conversations' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  search(@TenantId() tenantId: string, @Body() searchDto: SearchConversationsDto) {
    return this.conversationsService.findConversations(tenantId, searchDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new conversation' })
  create(@TenantId() tenantId: string, @Body() createDto: CreateConversationDto) {
    return this.conversationsService.createConversation(tenantId, createDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with its messages' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.getConversation(tenantId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  sendMessage(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() sendDto: SendMessageDto,
  ) {
    return this.conversationsService.sendMessage(tenantId, id, sendDto);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign conversation to a user' })
  assignConversation(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body('user_id') userId: string,
  ) {
    return this.conversationsService.assignConversation(tenantId, id, userId);
  }
}
