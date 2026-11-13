import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  Headers,
  RawBodyRequest,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { Response, Request } from 'express';
import { SendWhatsappMessageDto } from './dto/send-whatsapp-message.dto';
import { CreateWhatsappAccountDto } from './dto/create-whatsapp-account.dto';
import { UpdateWhatsappAccountDto } from './dto/update-whatsapp-account.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { AcceptCallDto, RejectCallDto, EndCallDto } from './dto/whatsapp-call.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('WhatsApp Cloud API & Webhook')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  @ApiOperation({
    summary: 'تأكيد اشتراك الـ Webhook مع خوادم Meta (Webhook Verification)',
    description: 'يستقبل استعلام التحقق من خوادم Meta ويقوم بإرجاع hub.challenge في حال تطابق التوكن.',
  })
  @ApiQuery({ name: 'hub.mode', required: true, example: 'subscribe' })
  @ApiQuery({ name: 'hub.challenge', required: true, example: '1158201444' })
  @ApiQuery({ name: 'hub.verify_token', required: true, example: 'orca_crm_verify_token_123' })
  @ApiResponse({ status: 200, description: 'تم تأكيد الاشتراك بنجاح' })
  @ApiResponse({ status: 403, description: 'التوكن غير متطابق' })
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.challenge') challenge: string,
    @Query('hub.verify_token') token: string,
    @Res() res: Response,
  ) {
    const isValid = this.whatsappService.verifyWebhookToken(mode, token);

    if (isValid) {
      return res.status(HttpStatus.OK).send(challenge);
    }

    return res.status(HttpStatus.FORBIDDEN).send('Verification token mismatch');
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'استقبال الرسائل وتحديثات الحالة من Meta WhatsApp Webhook',
    description: 'يتحقق من توقيع HMAC-SHA256 (x-hub-signature-256) ويعالج الرسائل الواردة فوراً.',
  })
  @ApiResponse({ status: 200, description: 'تم استقبال الحدث بنجاح' })
  @ApiResponse({ status: 403, description: 'التوقيع الرقمي غير صالح' })
  async receiveWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // 1. التحقق من أمان الطلب عبر التوقيع الرقمي
    const rawPayload = req.rawBody || Buffer.from(JSON.stringify(body));
    const isSignatureValid = this.whatsappService.verifySignature(rawPayload, signature);

    if (!isSignatureValid) {
      return res.status(HttpStatus.FORBIDDEN).send('Invalid signature');
    }

    // 2. معالجة الرسائل في الخلفية وتأكيد الاستلام فوراً لـ Meta
    this.whatsappService.handleIncomingWebhook(body).catch((err) => {
      // تجنب إسقاط الطلب في حال وجود خطأ في معالجة السجل الفردي
      console.error('Error handling webhook payload:', err);
    });

    return res.status(HttpStatus.OK).send('EVENT_RECEIVED');
  }

  @Post('send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إرسال رسالة واتساب مباشرة (نص أو قالب معتمد)',
  })
  @ApiResponse({ status: 200, description: 'تم إرسال الرسالة بنجاح' })
  async sendMessageDirect(@Body() dto: SendWhatsappMessageDto) {
    if (dto.type === 'template' && dto.templateName) {
      return this.whatsappService.sendTemplateMessage(
        dto.to,
        dto.templateName,
        dto.templateLanguage || 'ar',
      );
    }

    return this.whatsappService.sendTextMessage(dto.to, dto.text || '');
  }

  @Get('accounts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'استرجاع جميع أرقام وحسابات واتساب المربوطة بالشركة' })
  async getAccounts(@TenantId() tenantId: string) {
    const accounts = await this.whatsappService.getAccounts(tenantId);
    return { data: accounts, total: accounts.length };
  }

  @Post('accounts')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'إضافة رقم وحساب واتساب جديد للشركة' })
  async createAccount(
    @TenantId() tenantId: string,
    @Body() dto: CreateWhatsappAccountDto,
  ) {
    return this.whatsappService.createAccount(tenantId, dto);
  }

  @Put('accounts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تعديل إعدادات حساب واتساب أو تعيينه كافتراضي' })
  @ApiParam({ name: 'id', description: 'معرف الحساب' })
  async updateAccount(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWhatsappAccountDto,
  ) {
    return this.whatsappService.updateAccount(tenantId, id, dto);
  }

  @Delete('accounts/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'حذف حساب ورقم واتساب من الشركة' })
  @ApiParam({ name: 'id', description: 'معرف الحساب' })
  async deleteAccount(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    await this.whatsappService.deleteAccount(tenantId, id);
    return { success: true, message: 'تم حذف الحساب بنجاح' };
  }

  @Post('accounts/test-connection')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'اختبار صحة الاتصال مع خوادم Meta لرقم محدد قبل الحفظ' })
  async testConnection(@Body() dto: TestConnectionDto) {
    return this.whatsappService.testConnection(dto);
  }

  @Post('calls/accept')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'قبول مكالمة واتساب واردة والرد عليها (WebRTC SDP Answer)' })
  @ApiResponse({ status: 200, description: 'تم قبول المكالمة بنجاح' })
  async acceptCall(@Body() dto: AcceptCallDto) {
    return this.whatsappService.acceptCall(dto);
  }

  @Post('calls/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'رفض مكالمة واتساب واردة' })
  @ApiResponse({ status: 200, description: 'تم رفض المكالمة' })
  async rejectCall(@Body() dto: RejectCallDto) {
    return this.whatsappService.rejectCall(dto);
  }

  @Post('calls/end')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'إنهاء مكالمة واتساب نشطة' })
  @ApiResponse({ status: 200, description: 'تم إنهاء المكالمة' })
  async endCall(@Body() dto: EndCallDto) {
    return this.whatsappService.endCall(dto);
  }
}
