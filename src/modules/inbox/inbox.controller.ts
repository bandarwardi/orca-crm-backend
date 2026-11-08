import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { MessageContentType } from './entities/message.entity';

@ApiTags('Inbox & WhatsApp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'استرجاع جميع المحادثات للـ Tenant' })
  async findAllConversations(@TenantId() tenantId: string) {
    const conversations = await this.inboxService.findAllConversations(tenantId);
    return {
      data: conversations,
      total: conversations.length,
    };
  }

  @Post('conversations')
  @ApiOperation({ summary: 'بدء محادثة جديدة مع رقم هاتف وإرسال الرسالة الأولى' })
  async startConversation(
    @TenantId() tenantId: string,
    @Body()
    dto: {
      phone_number: string;
      contact_name?: string;
      content: string;
      content_type?: MessageContentType;
      whatsapp_account_id?: string;
      template_name?: string;
      template_language?: string;
    },
  ) {
    return this.inboxService.startConversation(tenantId, dto);
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'استرجاع الرسائل الخاصة بمحادثة معينة' })
  @ApiParam({ name: 'id', description: 'معرف المحادثة (UUID)' })
  async findConversationMessages(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const messages = await this.inboxService.findConversationMessages(tenantId, id);
    return {
      data: messages,
      total: messages.length,
    };
  }

  @Post('conversations/:id/messages')
  @ApiOperation({ summary: 'إرسال رسالة في محادثة' })
  @ApiParam({ name: 'id', description: 'معرف المحادثة (UUID)' })
  async sendMessage(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { content: string; content_type?: MessageContentType; whatsapp_account_id?: string; filename?: string; caption?: string },
  ) {
    return this.inboxService.sendMessage(tenantId, id, dto);
  }

  @Post('upload')
  @ApiOperation({ summary: 'رفع ملف أو صورة مرفقة للمحادثة' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('لم يتم تزويد أي ملف للرفع');
    }
    return this.inboxService.handleFileUpload(file, req);
  }

  @Public()
  @Get('media/:filename')
  @ApiOperation({ summary: 'تحميل أو استعراض الوسائط والملفات المرفقة (عام للمحادثات وواتساب)' })
  async getMedia(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    return this.inboxService.serveMediaFile(filename, res);
  }
}
