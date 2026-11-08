import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from '../inbox/entities/conversation.entity';
import { Message, MessageDirection, MessageContentType, MessageStatus } from '../inbox/entities/message.entity';
import { Customer } from '../customers/entities/customer.entity';
import { InboxGateway } from '../inbox/inbox.gateway';
import { CallLogQueryDto } from './dto/call-log-query.dto';

import { RingcentralConfig, RingcentralStatus } from './entities/ringcentral-config.entity';
import { RingcentralPhoneNumber } from './entities/ringcentral-phone-number.entity';
import { UpdateRingcentralConfigDto, TestRingcentralConnectionDto } from './dto/ringcentral-config.dto';
import { CreateRingcentralPhoneNumberDto, UpdateRingcentralPhoneNumberDto } from './dto/ringcentral-phone-number.dto';

export interface RingCentralAuthToken {
  accessToken: string;
  expiresAt: number;
}

export interface RingCentralSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class RingcentralService {
  private readonly logger = new Logger(RingcentralService.name);
  private cachedToken: RingCentralAuthToken | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(RingcentralConfig)
    private readonly configRepo: Repository<RingcentralConfig>,
    @InjectRepository(RingcentralPhoneNumber)
    private readonly phoneRepo: Repository<RingcentralPhoneNumber>,
    @Inject(forwardRef(() => InboxGateway))
    private readonly inboxGateway: InboxGateway,
  ) {}

  /**
   * جلب إعدادات الربط الخاصة بالمستأجر
   */
  async getConfig(tenantId: string): Promise<any> {
    let config = await this.configRepo.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      config = this.configRepo.create({
        tenant_id: tenantId,
        server_url: this.configService.get<string>('RC_SERVER_URL') || 'https://platform.ringcentral.com',
        client_id: this.configService.get<string>('RC_CLIENT_ID') || '',
        client_secret: this.configService.get<string>('RC_CLIENT_SECRET') || '',
        jwt_token: this.configService.get<string>('RC_JWT_TOKEN') || '',
        main_phone_number: this.configService.get<string>('RC_MAIN_NUMBER') || '',
        webhook_verify_token: this.configService.get<string>('RC_WEBHOOK_VERIFY_TOKEN') || 'orca_rc_verify_token_123',
        is_enabled: !!(this.configService.get<string>('RC_CLIENT_ID')),
        status: this.configService.get<string>('RC_CLIENT_ID') ? RingcentralStatus.ACTIVE : RingcentralStatus.INACTIVE,
      });
      await this.configRepo.save(config);
    }

    return {
      id: config.id,
      tenant_id: config.tenant_id,
      server_url: config.server_url,
      client_id: config.client_id || '',
      has_client_secret: !!config.client_secret,
      has_jwt_token: !!config.jwt_token,
      main_phone_number: config.main_phone_number || '',
      webhook_verify_token: config.webhook_verify_token,
      is_enabled: config.is_enabled,
      status: config.status,
      last_tested_at: config.last_tested_at,
      last_error: config.last_error,
      webhook_url: `${process.env.APP_URL || 'https://api.orca-crm.com'}/api/ringcentral/webhook`,
    };
  }

  /**
   * تحديث إعدادات الربط
   */
  async updateConfig(tenantId: string, dto: UpdateRingcentralConfigDto): Promise<any> {
    let config = await this.configRepo.findOne({ where: { tenant_id: tenantId } });
    if (!config) {
      config = this.configRepo.create({ tenant_id: tenantId });
    }

    if (dto.server_url !== undefined) config.server_url = dto.server_url.trim();
    if (dto.client_id !== undefined) config.client_id = dto.client_id.trim();
    if (dto.client_secret !== undefined && dto.client_secret.trim()) config.client_secret = dto.client_secret.trim();
    if (dto.jwt_token !== undefined && dto.jwt_token.trim()) config.jwt_token = dto.jwt_token.trim();
    if (dto.main_phone_number !== undefined) config.main_phone_number = dto.main_phone_number.trim();
    if (dto.webhook_verify_token !== undefined) config.webhook_verify_token = dto.webhook_verify_token.trim();
    if (dto.is_enabled !== undefined) config.is_enabled = dto.is_enabled;

    await this.configRepo.save(config);
    return this.getConfig(tenantId);
  }

  /**
   * فحص الاتصال مع خوادم RingCentral
   */
  async testConnection(tenantId: string, dto?: TestRingcentralConnectionDto): Promise<{ success: boolean; message: string; data?: any }> {
    const config = await this.configRepo.findOne({ where: { tenant_id: tenantId } });

    const serverUrl = (dto?.server_url || config?.server_url || this.getServerUrl()).replace(/\/$/, '');
    const clientId = dto?.client_id || config?.client_id || this.configService.get<string>('RC_CLIENT_ID');
    const clientSecret = dto?.client_secret || config?.client_secret || this.configService.get<string>('RC_CLIENT_SECRET');
    const jwtToken = dto?.jwt_token || config?.jwt_token || this.configService.get<string>('RC_JWT_TOKEN');

    if (!clientId || !clientSecret || !jwtToken) {
      return {
        success: false,
        message: 'بيانات الاعتماد غير مكتملة. يرجى إدخال Client ID و Client Secret و JWT Token.',
      };
    }

    try {
      const tokenUrl = `${serverUrl}/restapi/oauth/token`;
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const params = new URLSearchParams();
      params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      params.append('assertion', jwtToken);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const tokenData = await response.json();

      if (!response.ok) {
        const errorDesc = tokenData.error_description || tokenData.message || tokenData.error || 'فشل الاتصال بخوادم RingCentral';
        if (config) {
          config.status = RingcentralStatus.ERROR;
          config.last_error = errorDesc;
          config.last_tested_at = new Date();
          await this.configRepo.save(config);
        }
        return {
          success: false,
          message: `فشل التحقق: ${errorDesc}`,
        };
      }

      // استعلام بيانات الحساب
      const accountRes = await fetch(`${serverUrl}/restapi/v1.0/account/~`, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      let accountInfo: any = {};
      if (accountRes.ok) {
        accountInfo = await accountRes.json();
      }

      if (config) {
        config.status = RingcentralStatus.ACTIVE;
        config.last_error = null;
        config.last_tested_at = new Date();
        if (accountInfo.mainNumber && !config.main_phone_number) {
          config.main_phone_number = accountInfo.mainNumber;
        }
        await this.configRepo.save(config);
      }

      return {
        success: true,
        message: 'تم الاتصال والتحقق من حساب RingCentral بنجاح!',
        data: {
          company_name: accountInfo.companyName || 'حساب RingCentral المعتمد',
          main_number: accountInfo.mainNumber || config?.main_phone_number || 'الرقم الرئيسي مفعل',
          status: accountInfo.status || 'Active',
          tier: accountInfo.serviceInfo?.brand?.name || 'Standard',
        },
      };
    } catch (err: any) {
      return {
        success: false,
        message: `تعذر الاتصال بالخادم: ${err?.message || 'خطأ في الشبكة'}`,
      };
    }
  }

  /**
   * استخراج رابط خادم RingCentral
   */
  private getServerUrl(): string {
    return (
      this.configService.get<string>('RC_SERVER_URL') ||
      'https://platform.ringcentral.com'
    ).replace(/\/$/, '');
  }

  /**
   * الحصول على Access Token لمصادقة خادم RingCentral عبر JWT
   */
  async getAccessToken(): Promise<string | null> {
    // 1. فحص التوكن المحفوظ مسبقاً إذا كان لا يزال سارياً
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 60000) {
      return this.cachedToken.accessToken;
    }

    const clientId = this.configService.get<string>('RC_CLIENT_ID');
    const clientSecret = this.configService.get<string>('RC_CLIENT_SECRET');
    const jwtToken = this.configService.get<string>('RC_JWT_TOKEN');

    if (!clientId || !clientSecret || !jwtToken) {
      this.logger.warn(
        'بيانات اعتماد RingCentral (RC_CLIENT_ID, RC_CLIENT_SECRET, RC_JWT_TOKEN) غير مكتملة في متغيرات البيئة. سيتم استخدام وضع المحاكاة التجريبي (Mock Mode).',
      );
      return null;
    }

    const serverUrl = this.getServerUrl();
    const tokenUrl = `${serverUrl}/restapi/oauth/token`;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
      params.append('assertion', jwtToken);

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`فشل المصادقة مع RingCentral: ${JSON.stringify(data)}`);
        return null;
      }

      const expiresInMs = (data.expires_in || 3600) * 1000;
      this.cachedToken = {
        accessToken: data.access_token,
        expiresAt: now + expiresInMs,
      };

      this.logger.log('تم تجديد رمز المصادقة (Access Token) مع RingCentral بنجاح.');
      return this.cachedToken.accessToken;
    } catch (error: any) {
      this.logger.error(`استثناء أثناء مصادقة RingCentral: ${error?.message || String(error)}`);
      return null;
    }
  }

  /**
   * إرسال رسالة نصية SMS عبر RingCentral REST API
   */
  async sendSms(to: string, text: string, from?: string): Promise<RingCentralSendResult> {
    const cleanTo = to.startsWith('+') ? to : `+${to.replace(/[^0-9]/g, '')}`;
    const token = await this.getAccessToken();

    // في حال عدم توفر التوكن بعد (وضع المحاكاة)
    if (!token) {
      const mockId = `mock_rc_sms_${Date.now()}`;
      this.logger.log(`[وضع تجريبي] تم إرسال رسالة SMS إلى ${cleanTo}: "${text}"`);
      await this.saveOutboundSms(cleanTo, text, mockId);
      return { success: true, messageId: mockId };
    }

    const serverUrl = this.getServerUrl();
    const url = `${serverUrl}/restapi/v1.0/account/~/extension/~/sms`;

    try {
      const payload: any = {
        to: [{ phoneNumber: cleanTo }],
        text,
      };

      if (from) {
        payload.from = { phoneNumber: from };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`فشل إرسال SMS عبر RingCentral: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.message || 'Failed to send SMS via RingCentral',
        };
      }

      const messageId = String(data.id || '');
      await this.saveOutboundSms(cleanTo, text, messageId);

      return { success: true, messageId };
    } catch (error: any) {
      this.logger.error(`خطأ أثناء استدعاء RingCentral SMS API: ${error?.message || String(error)}`);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * بدء اتصال عبر RingOut API (Click-to-Dial)
   */
  async initiateRingOut(toNumber: string, fromNumber?: string, callerId?: string): Promise<any> {
    const cleanTo = toNumber.startsWith('+') ? toNumber : `+${toNumber.replace(/[^0-9]/g, '')}`;
    const token = await this.getAccessToken();

    if (!token) {
      this.logger.log(`[وضع تجريبي] بدء مكالمة تجريبية RingOut إلى ${cleanTo}`);
      return {
        id: `mock_ringout_${Date.now()}`,
        status: { callStatus: 'InProgress' },
        message: 'تم إطلاق المكالمة في الوضع التجريبي',
      };
    }

    const serverUrl = this.getServerUrl();
    const url = `${serverUrl}/restapi/v1.0/account/~/extension/~/ring-out`;

    try {
      const payload: any = {
        to: { phoneNumber: cleanTo },
        playPrompt: false,
      };

      if (fromNumber) payload.from = { phoneNumber: fromNumber };
      if (callerId) payload.callerId = { phoneNumber: callerId };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`فشل طلب RingOut: ${JSON.stringify(data)}`);
        return { success: false, error: data.message || 'RingOut failed' };
      }

      return data;
    } catch (error: any) {
      this.logger.error(`خطأ أثناء طلب RingOut: ${error?.message || String(error)}`);
      return { success: false, error: error?.message || 'Network error' };
    }
  }

  /**
   * استرجاع سجل المكالمات (Call Log)
   */
  async getCallLog(query: CallLogQueryDto): Promise<{ records: any[]; total: number }> {
    const token = await this.getAccessToken();

    if (!token) {
      // إرجاع سجلات مكالمات نموذجية واقعية للواجهة في حال عدم تفعيل الحساب بعد
      const mockCalls = [
        {
          id: 'rc-call-101',
          sessionId: 'sess-101',
          direction: 'Inbound',
          from: { phoneNumber: '+13135550144', name: 'طارق المنصوري' },
          to: { phoneNumber: '+18005550199', name: 'دعم العملاء' },
          duration: 185,
          result: 'Accepted',
          action: 'Phone Call',
          startTime: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'rc-call-102',
          sessionId: 'sess-102',
          direction: 'Outbound',
          from: { phoneNumber: '+18005550199', name: 'أحمد سعيد (المبيعات)' },
          to: { phoneNumber: '+17735550192', name: 'سامي الزهراني' },
          duration: 412,
          result: 'Accepted',
          action: 'Phone Call',
          startTime: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: 'rc-call-103',
          sessionId: 'sess-103',
          direction: 'Inbound',
          from: { phoneNumber: '+16145550188', name: 'محمد الشمري' },
          to: { phoneNumber: '+18005550199', name: 'دعم العملاء' },
          duration: 0,
          result: 'Missed',
          action: 'Phone Call',
          startTime: new Date(Date.now() - 86400000).toISOString(),
        },
      ];

      return { records: mockCalls, total: mockCalls.length };
    }

    const serverUrl = this.getServerUrl();
    const params = new URLSearchParams();
    if (query.dateFrom) params.append('dateFrom', query.dateFrom);
    if (query.dateTo) params.append('dateTo', query.dateTo);
    if (query.page) params.append('page', String(query.page));
    if (query.perPage) params.append('perPage', String(query.perPage));
    params.append('view', 'Detailed');

    const url = `${serverUrl}/restapi/v1.0/account/~/extension/~/call-log?${params.toString()}`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      return {
        records: data.records || [],
        total: data.paging?.totalElements || (data.records ? data.records.length : 0),
      };
    } catch (error: any) {
      this.logger.error(`فشل استرجاع سجل المكالمات: ${error?.message || String(error)}`);
      return { records: [], total: 0 };
    }
  }

  /**
   * إنشاء اشتراك Webhook رسمي مع خوادم RingCentral
   */
  async createWebhookSubscription(webhookUrl: string): Promise<any> {
    const token = await this.getAccessToken();
    if (!token) {
      return { success: false, message: 'بيانات RingCentral غير متوفرة لإنشاء الاشتراك' };
    }

    const verificationToken =
      this.configService.get<string>('RC_WEBHOOK_VERIFY_TOKEN') ||
      'orca_rc_verify_token_default';

    const serverUrl = this.getServerUrl();
    const url = `${serverUrl}/restapi/v1.0/subscription`;

    const payload = {
      eventFilters: [
        '/restapi/v1.0/account/~/extension/~/message-store/instant?type=SMS',
        '/restapi/v1.0/account/~/extension/~/telephony/sessions',
      ],
      deliveryMode: {
        transportType: 'WebHook',
        address: webhookUrl,
        verificationToken,
      },
      expiresIn: 604800, // 7 أيام
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return await response.json();
  }

  /**
   * معالجة الحمولات الواردة من Webhook (رسائل SMS واردة وتحديثات المكالمات)
   */
  async handleIncomingWebhook(body: any) {
    if (!body) return;

    const event = body.event || '';
    const eventBody = body.body || {};

    // 1. رسالة SMS جديدة واردة
    if (event.includes('message-store') || event.includes('SMS')) {
      const changes = eventBody.changes || [eventBody];
      for (const item of changes) {
        const fromNumber = item.from?.phoneNumber || item.from;
        const text = item.subject || item.text || '';
        const rcMsgId = String(item.id || '');

        if (fromNumber && text) {
          await this.processIncomingSms(fromNumber, text, rcMsgId);
        }
      }
    }

    // 2. أحداث مكالمات هاتفية (بدء مكالمة / انتهائها)
    if (event.includes('telephony/sessions')) {
      const parties = eventBody.parties || [];
      const primaryParty = parties[0] || {};
      const status = primaryParty.status?.code;

      this.logger.log(`أحدث حالة مكالمة RingCentral: ${status} للجلسة ${eventBody.sessionId}`);

      // بث الحدث عبر WebSocket للموظفين المتابعين
      const anyCustomer = await this.customerRepo.findOne({ where: {} });
      if (anyCustomer?.tenant_id) {
        this.inboxGateway.server
          .to(`tenant_${anyCustomer.tenant_id}`)
          .emit('ringcentral_call_event', {
            sessionId: eventBody.sessionId,
            status,
            party: primaryParty,
            timestamp: new Date().toISOString(),
          });
      }
    }
  }

  /**
   * معالجة رسالة SMS واردة وحفظها وربطها بالعميل وبثها عبر الـ WebSocket
   */
  private async processIncomingSms(phone: string, text: string, rcMsgId: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    this.logger.log(`استقبال رسالة SMS من RingCentral من الرقم: ${cleanPhone}`);

    // البحث عن المحادثة السابقة
    let conversation = await this.conversationRepo.findOne({
      where: { phone_number: cleanPhone },
    });

    let tenantId = conversation?.tenant_id;

    if (!conversation) {
      const anyCustomer = await this.customerRepo.findOne({ where: {} });
      tenantId = anyCustomer?.tenant_id;
      if (!tenantId) return;

      let customer = await this.customerRepo.findOne({
        where: { phone: cleanPhone, tenant_id: tenantId },
      });

      if (!customer) {
        customer = this.customerRepo.create({
          tenant_id: tenantId,
          name: `عميل SMS (${cleanPhone.slice(-4)})`,
          phone: cleanPhone,
          city: 'الولايات المتحدة',
          source: 'RingCentral SMS',
        });
        await this.customerRepo.save(customer);
      }

      conversation = this.conversationRepo.create({
        tenant_id: tenantId,
        phone_number: cleanPhone,
        customer_id: customer.id,
        status: ConversationStatus.OPEN,
        last_message_at: new Date(),
      });
      await this.conversationRepo.save(conversation);
    }

    // حفظ الرسالة في قاعدة البيانات
    const message = this.messageRepo.create({
      tenant_id: tenantId,
      conversation_id: conversation.id,
      direction: MessageDirection.INBOUND,
      content_type: MessageContentType.TEXT,
      content: `[RingCentral SMS] ${text}`,
      status: MessageStatus.DELIVERED,
      whatsapp_message_id: rcMsgId,
    });
    await this.messageRepo.save(message);

    // تحديث المحادثة
    conversation.last_message_at = new Date();
    conversation.status = ConversationStatus.OPEN;
    await this.conversationRepo.save(conversation);

    // بث الحدث عبر WebSocket للـ CRM
    if (tenantId) {
      this.inboxGateway.emitNewMessage(tenantId, message);
      this.inboxGateway.emitConversationUpdated(tenantId, conversation);
    }
  }

  /**
   * حفظ رسالة SMS صادرة في قاعدة البيانات
   */
  private async saveOutboundSms(phone: string, text: string, msgId: string) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const conversation = await this.conversationRepo.findOne({
      where: { phone_number: cleanPhone },
    });

    if (conversation) {
      const msg = this.messageRepo.create({
        tenant_id: conversation.tenant_id,
        conversation_id: conversation.id,
        direction: MessageDirection.OUTBOUND,
        content_type: MessageContentType.TEXT,
        content: `[RingCentral SMS] ${text}`,
        status: MessageStatus.SENT,
        whatsapp_message_id: msgId,
      });
      await this.messageRepo.save(msg);
      this.inboxGateway.emitNewMessage(conversation.tenant_id, msg);
    }
  }

  // ==========================================
  // متعدد خطوط الهاتف (Multi-Line Phone Numbers)
  // ==========================================

  /**
   * جلب جميع خطوط الهاتف المسجلة للمستأجر
   */
  async getPhoneNumbers(tenantId: string): Promise<RingcentralPhoneNumber[]> {
    let numbers = await this.phoneRepo.find({
      where: { tenant_id: tenantId },
      order: { is_default: 'DESC', created_at: 'ASC' },
    });

    // إذا لم تكن هناك خطوط مسجلة، نقوم بإنشاء خط أولي من main_phone_number إن وجد
    if (numbers.length === 0) {
      const config = await this.configRepo.findOne({ where: { tenant_id: tenantId } });
      const mainNum = config?.main_phone_number || this.configService.get<string>('RC_MAIN_NUMBER');
      if (mainNum) {
        const defaultLine = this.phoneRepo.create({
          tenant_id: tenantId,
          phone_number: mainNum.trim(),
          label: 'الخط الرئيسي (Main Line)',
          department: 'sales',
          usage_type: 'MainCompanyNumber',
          features: ['Voice', 'SmsSender', 'CallerId'],
          is_default: true,
        });
        await this.phoneRepo.save(defaultLine);
        numbers = [defaultLine];
      }
    }

    return numbers;
  }

  /**
   * إضافة خط هاتفي جديد يدوياً
   */
  async createPhoneNumber(tenantId: string, dto: CreateRingcentralPhoneNumberDto): Promise<RingcentralPhoneNumber> {
    const cleanNumber = dto.phone_number.trim();

    // فحص ما إذا كان الرقم مضافاً سابقاً
    const existing = await this.phoneRepo.findOne({
      where: { tenant_id: tenantId, phone_number: cleanNumber },
    });
    if (existing) {
      existing.label = dto.label.trim();
      if (dto.department) existing.department = dto.department;
      if (dto.features) existing.features = dto.features;
      if (dto.extension_number) existing.extension_number = dto.extension_number;
      if (dto.is_default) {
        await this.phoneRepo.update({ tenant_id: tenantId }, { is_default: false });
        existing.is_default = true;
      }
      return this.phoneRepo.save(existing);
    }

    // إذا كان هذا أول رقم أو تم تعيينه كافتراضي
    const existingCount = await this.phoneRepo.count({ where: { tenant_id: tenantId } });
    const isDefault = dto.is_default || existingCount === 0;

    if (isDefault) {
      await this.phoneRepo.update({ tenant_id: tenantId }, { is_default: false });
    }

    const newLine = this.phoneRepo.create({
      tenant_id: tenantId,
      phone_number: cleanNumber,
      label: dto.label.trim(),
      department: dto.department || 'sales',
      usage_type: dto.usage_type || 'CompanyNumber',
      extension_number: dto.extension_number,
      features: dto.features || ['Voice', 'SmsSender'],
      is_default: isDefault,
    });

    const saved = await this.phoneRepo.save(newLine);

    // تحديث الرقم الرئيسي في الإعدادات إذا كان هذا الرقم افتراضياً
    if (isDefault) {
      await this.configRepo.update({ tenant_id: tenantId }, { main_phone_number: cleanNumber });
    }

    return saved;
  }

  /**
   * تحديث بيانات خط هاتفي
   */
  async updatePhoneNumber(tenantId: string, id: string, dto: UpdateRingcentralPhoneNumberDto): Promise<RingcentralPhoneNumber> {
    const line = await this.phoneRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!line) {
      throw new Error('الخط الهاتفي غير موجود');
    }

    if (dto.phone_number !== undefined) line.phone_number = dto.phone_number.trim();
    if (dto.label !== undefined) line.label = dto.label.trim();
    if (dto.department !== undefined) line.department = dto.department;
    if (dto.extension_number !== undefined) line.extension_number = dto.extension_number;
    if (dto.features !== undefined) line.features = dto.features;

    if (dto.is_default) {
      await this.phoneRepo.update({ tenant_id: tenantId }, { is_default: false });
      line.is_default = true;
      await this.configRepo.update({ tenant_id: tenantId }, { main_phone_number: line.phone_number });
    }

    return this.phoneRepo.save(line);
  }

  /**
   * حذف خط هاتفي
   */
  async deletePhoneNumber(tenantId: string, id: string): Promise<void> {
    const line = await this.phoneRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!line) return;

    await this.phoneRepo.delete({ id, tenant_id: tenantId });

    // إذا كان المحذوف هو الافتراضي، نجعل أول خط متبقي افتراضياً
    if (line.is_default) {
      const firstRemaining = await this.phoneRepo.findOne({
        where: { tenant_id: tenantId },
        order: { created_at: 'ASC' },
      });
      if (firstRemaining) {
        firstRemaining.is_default = true;
        await this.phoneRepo.save(firstRemaining);
        await this.configRepo.update({ tenant_id: tenantId }, { main_phone_number: firstRemaining.phone_number });
      }
    }
  }

  /**
   * تعيين خط هاتفي كخط افتراضي للمستأجر
   */
  async setDefaultPhoneNumber(tenantId: string, id: string): Promise<RingcentralPhoneNumber> {
    const line = await this.phoneRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!line) {
      throw new Error('الخط الهاتفي غير موجود');
    }

    await this.phoneRepo.update({ tenant_id: tenantId }, { is_default: false });
    line.is_default = true;
    await this.phoneRepo.save(line);

    await this.configRepo.update({ tenant_id: tenantId }, { main_phone_number: line.phone_number });
    return line;
  }

  /**
   * مزامنة خطوط الهاتف تلقائياً من خوادم RingCentral
   */
  async syncPhoneNumbersFromRingcentral(tenantId: string): Promise<{ synced: number; numbers: RingcentralPhoneNumber[] }> {
    const config = await this.configRepo.findOne({ where: { tenant_id: tenantId } });
    const serverUrl = (config?.server_url || this.getServerUrl()).replace(/\/$/, '');
    const token = await this.getAccessToken();

    if (!token) {
      this.logger.warn('لا يمكن مزامنة أرقام RingCentral: رمز الوصول غير متاح.');
      // في حال بيئة التطوير دون اتصال حي، نعيد الأرقام الحالية
      const existing = await this.getPhoneNumbers(tenantId);
      return { synced: existing.length, numbers: existing };
    }

    try {
      const url = `${serverUrl}/restapi/v1.0/account/~/phone-number`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`فشل استعلام أرقام RingCentral: ${errorText}`);
        throw new Error('فشل جلب أرقام الهواتف من RingCentral');
      }

      const data = await response.json();
      const records: any[] = data.records || [];

      let syncedCount = 0;

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rawNumber = record.phoneNumber;
        if (!rawNumber) continue;

        let line = await this.phoneRepo.findOne({
          where: { tenant_id: tenantId, phone_number: rawNumber },
        });

        const isMain = record.usageType === 'MainCompanyNumber';
        const label = record.label || (isMain ? 'الرقم الرئيسي للشركة' : (record.extension ? `خط داخلي (${record.extension.name || record.extension.extensionNumber})` : `خط RingCentral ${i + 1}`));
        const department = isMain ? 'sales' : (label.includes('دعم') ? 'support' : 'sales');

        if (!line) {
          line = this.phoneRepo.create({
            tenant_id: tenantId,
            phone_number: rawNumber,
            label,
            department,
            usage_type: record.usageType || 'CompanyNumber',
            extension_number: record.extension?.extensionNumber,
            features: record.features || ['Voice', 'SmsSender'],
            is_default: isMain || (i === 0 && (await this.phoneRepo.count({ where: { tenant_id: tenantId } })) === 0),
          });
        } else {
          line.label = label;
          line.usage_type = record.usageType;
          line.extension_number = record.extension?.extensionNumber;
          line.features = record.features;
          if (isMain) line.is_default = true;
        }

        await this.phoneRepo.save(line);
        syncedCount++;
      }

      const all = await this.getPhoneNumbers(tenantId);
      return { synced: syncedCount, numbers: all };
    } catch (err: any) {
      this.logger.error(`استثناء أثناء مزامنة أرقام RingCentral: ${err?.message || err}`);
      throw err;
    }
  }
}

