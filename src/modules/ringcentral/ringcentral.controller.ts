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
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { RingcentralService } from './ringcentral.service';
import { Response } from 'express';
import { SendRcSmsDto } from './dto/send-rc-sms.dto';
import { RingOutDto } from './dto/ring-out.dto';
import { CallLogQueryDto } from './dto/call-log-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UpdateRingcentralConfigDto, TestRingcentralConnectionDto } from './dto/ringcentral-config.dto';
import { CreateRingcentralPhoneNumberDto, UpdateRingcentralPhoneNumberDto } from './dto/ringcentral-phone-number.dto';

@ApiTags('RingCentral Telephony & SMS API')
@Controller('ringcentral')
export class RingcentralController {
  constructor(
    private readonly ringcentralService: RingcentralService,
    private readonly configService: ConfigService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'استقبال أحداث الـ Webhook وتأكيد الاشتراك (Validation Handshake)',
    description:
      'يتعامل مع مصافحة التحقق الأولية من RingCentral عبر ترويسة Validation-Token، ويستقبل أحداث المكالمات وSMS.',
  })
  @ApiResponse({ status: 200, description: 'تم استلام الحدث بنجاح' })
  async handleWebhook(
    @Headers('validation-token') validationToken: string,
    @Headers('verification-token') verificationToken: string,
    @Body() body: any,
    @Res() res: Response,
  ) {
    // 1. مصافحة التحقق الخاصة بـ RingCentral (يجب إرجاع الـ Validation-Token في ترويسة الاستجابة فوراً)
    if (validationToken) {
      res.setHeader('Validation-Token', validationToken);
      return res.status(HttpStatus.OK).send();
    }

    // 2. التحقق من أمان الإشعار عبر Verification-Token (إن وجد في الإعدادات)
    const expectedToken = this.configService.get<string>('RC_WEBHOOK_VERIFY_TOKEN');
    if (expectedToken && verificationToken && verificationToken !== expectedToken) {
      return res.status(HttpStatus.FORBIDDEN).send('Verification token mismatch');
    }

    // 3. معالجة الأحداث الواردة
    this.ringcentralService.handleIncomingWebhook(body).catch((err) => {
      console.error('Error handling RingCentral webhook payload:', err);
    });

    return res.status(HttpStatus.OK).send('OK');
  }

  @Post('sms')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إرسال رسالة SMS أمريكية/دولية عبر RingCentral',
  })
  @ApiResponse({ status: 200, description: 'تم إرسال الرسالة بنجاح' })
  async sendSms(@Body() dto: SendRcSmsDto) {
    return this.ringcentralService.sendSms(dto.to, dto.text, dto.from);
  }

  @Post('ring-out')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إطلاق مكالمة هاتفية عبر RingOut (Click-to-Dial)',
  })
  @ApiResponse({ status: 200, description: 'تم بدء المكالمة بنجاح' })
  async initiateRingOut(@Body() dto: RingOutDto) {
    return this.ringcentralService.initiateRingOut(dto.toNumber, dto.fromNumber, dto.callerId);
  }

  @Get('call-log')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'جلب سجل المكالمات الهاتفية (Call Log)',
  })
  @ApiResponse({ status: 200, description: 'سجلات المكالمات' })
  async getCallLog(@Query() query: CallLogQueryDto) {
    return this.ringcentralService.getCallLog(query);
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'إنشاء اشتراك Webhook تلقائي في منصة RingCentral',
  })
  async createSubscription(@Body('webhookUrl') webhookUrl: string) {
    return this.ringcentralService.createWebhookSubscription(webhookUrl);
  }

  @Get('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'استرجاع إعدادات ربط RingCentral للمنشأة' })
  async getConfig(@TenantId() tenantId: string) {
    return this.ringcentralService.getConfig(tenantId);
  }

  @Post('config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تحديث إعدادات ربط RingCentral للمنشأة' })
  async updateConfig(
    @TenantId() tenantId: string,
    @Body() dto: UpdateRingcentralConfigDto,
  ) {
    return this.ringcentralService.updateConfig(tenantId, dto);
  }

  @Post('test-connection')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'فحص الاتصال والتحقق مع خوادم RingCentral' })
  async testConnection(
    @TenantId() tenantId: string,
    @Body() dto: TestRingcentralConnectionDto,
  ) {
    return this.ringcentralService.testConnection(tenantId, dto);
  }

  // ==========================================
  // متعدد خطوط الهاتف (Multi-Line Phone Numbers)
  // ==========================================

  @Get('phone-numbers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'جلب جميع خطوط وأرقام هواتف RingCentral المربوطة' })
  async getPhoneNumbers(@TenantId() tenantId: string) {
    return this.ringcentralService.getPhoneNumbers(tenantId);
  }

  @Post('phone-numbers')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'إضافة خط هاتفي جديد لـ RingCentral يدوياً' })
  async createPhoneNumber(
    @TenantId() tenantId: string,
    @Body() dto: CreateRingcentralPhoneNumberDto,
  ) {
    return this.ringcentralService.createPhoneNumber(tenantId, dto);
  }

  @Put('phone-numbers/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تحديث بيانات خط هاتفي' })
  @ApiParam({ name: 'id', description: 'معرف الخط الهاتفي' })
  async updatePhoneNumber(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRingcentralPhoneNumberDto,
  ) {
    return this.ringcentralService.updatePhoneNumber(tenantId, id, dto);
  }

  @Delete('phone-numbers/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'حذف خط هاتفي' })
  @ApiParam({ name: 'id', description: 'معرف الخط الهاتفي' })
  async deletePhoneNumber(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.ringcentralService.deletePhoneNumber(tenantId, id);
  }

  @Post('phone-numbers/:id/default')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'تعيين الخط كرقم افتراضي للشركة' })
  @ApiParam({ name: 'id', description: 'معرف الخط الهاتفي' })
  async setDefaultPhoneNumber(
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.ringcentralService.setDefaultPhoneNumber(tenantId, id);
  }

  @Post('phone-numbers/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'مزامنة الخطوط تلقائياً من خوادم RingCentral' })
  async syncPhoneNumbers(@TenantId() tenantId: string) {
    return this.ringcentralService.syncPhoneNumbersFromRingcentral(tenantId);
  }
}

