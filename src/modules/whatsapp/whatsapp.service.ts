import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Conversation, ConversationStatus } from '../inbox/entities/conversation.entity';
import { Message, MessageDirection, MessageContentType, MessageStatus } from '../inbox/entities/message.entity';
import { Customer } from '../customers/entities/customer.entity';
import { WhatsappAccount, WhatsAppAccountStatus } from './entities/whatsapp-account.entity';
import { InboxGateway } from '../inbox/inbox.gateway';
import { CreateWhatsappAccountDto } from './dto/create-whatsapp-account.dto';
import { UpdateWhatsappAccountDto } from './dto/update-whatsapp-account.dto';
import { TestConnectionDto } from './dto/test-connection.dto';
import { convertToOggOpus } from '../../common/utils/audio-converter.util';

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(WhatsappAccount)
    private readonly accountRepo: Repository<WhatsappAccount>,
    @Inject(forwardRef(() => InboxGateway))
    private readonly inboxGateway: InboxGateway,
  ) {}

  /**
   * التحقق من توكن الاشتراك في الـ Webhook المرسل من قبل Meta
   */
  verifyWebhookToken(mode: string, token: string): boolean {
    const configuredToken =
      this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') ||
      'orca_crm_verify_token_123';
    return mode === 'subscribe' && token === configuredToken;
  }

  /**
   * التحقق من صحة التوقيع الرقمي للطلب الوارد (X-Hub-Signature-256)
   */
  verifySignature(rawBody: Buffer | string | undefined, signatureHeader?: string): boolean {
    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');

    // في حال عدم تعيين السر محلياً في التطوير، نسمح بالمرور مع تسجيل تنبيه
    if (!appSecret) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('WHATSAPP_APP_SECRET is not configured in production');
        return false;
      }
      this.logger.warn('WHATSAPP_APP_SECRET is not configured. Skipping signature verification in development.');
      return true;
    }

    if (!signatureHeader || !rawBody) {
      this.logger.warn('Missing signature header or raw body for WhatsApp webhook verification');
      return false;
    }

    const [algorithm, signature] = signatureHeader.split('=');
    if (algorithm !== 'sha256' || !signature) {
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', appSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');

      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      if (expectedBuffer.length !== signatureBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
    } catch (err: any) {
      this.logger.error(`Error calculating signature hash: ${err?.message || String(err)}`);
      return false;
    }
  }

  /**
   * استرجاع جميع حسابات وأرقام واتساب الخاصة بالمستأجر
   */
  async getAccounts(tenantId: string): Promise<WhatsappAccount[]> {
    return this.accountRepo.find({
      where: { tenant_id: tenantId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  /**
   * إضافة حساب ورقم واتساب جديد للشركة
   */
  async createAccount(tenantId: string, dto: CreateWhatsappAccountDto): Promise<WhatsappAccount> {
    if (dto.is_default) {
      await this.accountRepo.update({ tenant_id: tenantId }, { is_default: false });
    }

    const account = this.accountRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      phone_number: dto.phone_number,
      phone_number_id: dto.phone_number_id,
      waba_id: dto.waba_id,
      access_token: dto.access_token,
      app_secret: dto.app_secret,
      is_default: dto.is_default ?? false,
      status: dto.status || WhatsAppAccountStatus.ACTIVE,
    });

    return this.accountRepo.save(account);
  }

  /**
   * تحديث بيانات حساب واتساب أو تعيينه كافتراضي
   */
  async updateAccount(
    tenantId: string,
    id: string,
    dto: UpdateWhatsappAccountDto,
  ): Promise<WhatsappAccount> {
    const account = await this.accountRepo.findOne({ where: { id, tenant_id: tenantId } });
    if (!account) {
      throw new Error('حساب واتساب غير موجود');
    }

    if (dto.is_default) {
      await this.accountRepo.update({ tenant_id: tenantId }, { is_default: false });
    }

    Object.assign(account, dto);
    return this.accountRepo.save(account);
  }

  /**
   * حذف حساب واتساب
   */
  async deleteAccount(tenantId: string, id: string): Promise<void> {
    await this.accountRepo.delete({ id, tenant_id: tenantId });
  }

  /**
   * اختبار صحة الاتصال مع خوادم Meta لرقم محدد قبل الحفظ
   */
  async testConnection(dto: TestConnectionDto): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';
    const url = `https://graph.facebook.com/${apiVersion}/${dto.phone_number_id}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${dto.access_token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error?.message || 'فشل الاتصال مع Meta API';
        if (data.error?.code === 190 || errorMsg.includes('Session has expired')) {
          errorMsg = 'انتهت صلاحية رمز الوصول (Access Token). يرجى نسخ توكن جديد من لوحة مطوري فيسبوك (Meta) وتحديثه في الحساب.';
        }
        return {
          success: false,
          message: errorMsg,
          error: errorMsg,
        };
      }

      return {
        success: true,
        message: 'تم الاتصال بخوادم Meta بنجاح والرقم متصل وجاهز للاستخدام',
        data: {
          verified_name: data.verified_name || data.display_phone_number || 'حساب واتساب معتمد',
          display_phone_number: data.display_phone_number || dto.phone_number_id,
          quality_rating: data.quality_rating || 'UNKNOWN',
        },
      };
    } catch (err: any) {
      const msg = err?.message || 'خطأ في الشبكة أثناء الاتصال مع خوادم Meta';
      return {
        success: false,
        message: msg,
        error: msg,
      };
    }
  }

  /**
   * استخراج التوكن ومعرف الرقم بحسب الحساب المحدد أو المستأجر أو البيئة
   */
  async resolveCredentials(options?: {
    tenantId?: string;
    accountId?: string;
    phoneNumberId?: string;
  }): Promise<{ accessToken: string; phoneNumberId: string } | null> {
    let account: WhatsappAccount | null = null;

    if (options?.accountId) {
      account = await this.accountRepo.findOne({ where: { id: options.accountId } });
    } else if (options?.phoneNumberId) {
      account = await this.accountRepo.findOne({ where: { phone_number_id: options.phoneNumberId } });
    } else if (options?.tenantId) {
      account = await this.accountRepo.findOne({
        where: { tenant_id: options.tenantId, is_default: true, status: WhatsAppAccountStatus.ACTIVE },
      });
      if (!account) {
        account = await this.accountRepo.findOne({
          where: { tenant_id: options.tenantId, status: WhatsAppAccountStatus.ACTIVE },
        });
      }
    }

    if (account?.access_token && account?.phone_number_id) {
      return {
        accessToken: account.access_token,
        phoneNumberId: account.phone_number_id,
      };
    }

    const envToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
    const envPhoneId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');

    if (envToken && envPhoneId) {
      return {
        accessToken: envToken,
        phoneNumberId: envPhoneId,
      };
    }

    return null;
  }

  /**
   * إرسال رسالة نصية حرة عبر WhatsApp Cloud API
   * (صالحة خلال نافذة الـ 24 ساعة من تفاعل العميل)
   */
  async sendTextMessage(
    to: string,
    text: string,
    options?: { tenantId?: string; accountId?: string; phoneNumberId?: string },
  ): Promise<WhatsAppSendResult> {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const credentials = await this.resolveCredentials(options);
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';

    if (!credentials) {
      this.logger.warn('WhatsApp credentials (ACCESS_TOKEN or PHONE_NUMBER_ID) missing. Outbound message skipped/mocked.');
      return {
        success: true,
        messageId: `mock_wa_${Date.now()}`,
      };
    }

    const { accessToken, phoneNumberId } = credentials;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp message: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.error?.message || 'Failed to send message via WhatsApp Cloud API',
        };
      }

      const messageId = data?.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      this.logger.error(`Exception while calling WhatsApp API: ${error?.message || String(error)}`);
      return {
        success: false,
        error: error?.message || 'Network error calling WhatsApp API',
      };
    }
  }

  /**
   * إرسال وسائط (صورة، مستند، تسجيل صوتي) عبر WhatsApp Cloud API
   */
  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    type: 'image' | 'document' | 'audio',
    caption?: string,
    filename?: string,
    options?: { tenantId?: string; accountId?: string; phoneNumberId?: string },
  ): Promise<WhatsAppSendResult> {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const credentials = await this.resolveCredentials(options);
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';

    if (!credentials) {
      this.logger.warn(`WhatsApp credentials missing. Outbound ${type} message mocked.`);
      return {
        success: true,
        messageId: `mock_wa_media_${Date.now()}`,
      };
    }

    const { accessToken, phoneNumberId } = credentials;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    // 1. إذا كان الملف محفوظاً محلياً على السيرفر في uploads، نقوم برفعه مباشرة إلى Meta Media API
    // هذا يضمن استلام العميل للملف كملف/صورة حقيقية كاملة وليس كرابط نصي، ويعمل محلياً وعبر السيرفر
    let localFilePath: string | null = null;
    try {
      const cleanUrl = mediaUrl.split('?')[0];
      const parsed = new URL(cleanUrl, 'http://localhost');
      const filenameCandidate = path.basename(parsed.pathname);
      const candidatePath = path.join(process.cwd(), 'uploads', filenameCandidate);
      if (fs.existsSync(candidatePath)) {
        localFilePath = candidatePath;
      }
    } catch (_) {}

    if (localFilePath) {
      try {
        if (type === 'audio') {
          localFilePath = await convertToOggOpus(localFilePath);
        }

        const basename = path.basename(localFilePath);
        const buffer = await fs.promises.readFile(localFilePath);
        let mimeType = 'application/octet-stream';
        let actualType: 'image' | 'document' | 'audio' = type;

        const isPng = buffer.length > 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        const isJpg = buffer.length > 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;

        if (type === 'image') {
          if (isPng) {
            mimeType = 'image/png';
          } else if (isJpg) {
            mimeType = 'image/jpeg';
          } else {
            // Meta WhatsApp API only allows image/jpeg and image/png for 'image'.
            // For AVIF/WebP or other image formats, deliver as 'document' to prevent Meta rejection.
            actualType = 'document';
            mimeType = basename.toLowerCase().endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
          }
        } else if (type === 'document') {
          mimeType = basename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
        } else if (type === 'audio') {
          mimeType = 'audio/ogg; codecs=opus';
        }

        const cleanDisplayName = actualType === 'audio'
          ? 'voice_note.ogg'
          : (filename || basename.replace(/^\d+_/, '') || (actualType === 'image' ? 'image.jpg' : 'document.pdf'));
        const blob = new Blob([buffer], { type: mimeType });

        const formData = new FormData();
        formData.append('messaging_product', 'whatsapp');
        formData.append('file', blob, cleanDisplayName);
        formData.append('type', mimeType);

        const uploadUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/media`;
        const uploadRes = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (uploadRes.ok && uploadData?.id) {
          const mediaPayload: any = { id: uploadData.id };
          if (actualType === 'audio') {
            mediaPayload.voice = true;
          }
          if (caption && actualType !== 'audio') {
            mediaPayload.caption = caption;
          }
          if (actualType === 'document') {
            mediaPayload.filename = cleanDisplayName;
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              recipient_type: 'individual',
              to: cleanTo,
              type: actualType,
              [actualType]: mediaPayload,
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            this.logger.error(`Failed to send WhatsApp ${type} by media ID: ${JSON.stringify(data)}`);
            return {
              success: false,
              error: data.error?.message || `Failed to send ${type} via WhatsApp API`,
            };
          }

          return {
            success: true,
            messageId: data?.messages?.[0]?.id,
          };
        } else {
          this.logger.error(`Failed to upload media to Meta Graph API: ${JSON.stringify(uploadData)}`);
        }
      } catch (err: any) {
        this.logger.error(`Exception during Meta media upload: ${err?.message || String(err)}`);
      }
    }

    // 2. البديل (Fallback): إذا لم يتوفر الملف محلياً وكان رابطاً عاماً
    // Support relative local URL by prepending public base URL
    let finalMediaUrl = mediaUrl;
    if (finalMediaUrl.startsWith('/')) {
      const configuredBase = this.configService.get<string>('APP_URL') || this.configService.get<string>('PUBLIC_URL');
      if (configuredBase) {
        finalMediaUrl = `${configuredBase.replace(/\/$/, '')}${finalMediaUrl}`;
      }
    }

    // If media is not public HTTP URL (e.g. data URI), return successful mock/local delivery
    if (!finalMediaUrl.startsWith('http://') && !finalMediaUrl.startsWith('https://')) {
      this.logger.warn(`Media URL is not a valid HTTP/HTTPS URL: ${finalMediaUrl}. Outbound ${type} mock delivered.`);
      return {
        success: true,
        messageId: `wa_local_${Date.now()}`,
      };
    }

    const mediaPayload: any = { link: finalMediaUrl };
    if (type === 'audio') {
      mediaPayload.voice = true;
    }
    if (caption && type !== 'audio') {
      mediaPayload.caption = caption;
    }
    if (filename && type === 'document') {
      mediaPayload.filename = filename;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanTo,
          type,
          [type]: mediaPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp ${type}: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.error?.message || `Failed to send ${type} via WhatsApp API`,
        };
      }

      return {
        success: true,
        messageId: data?.messages?.[0]?.id,
      };
    } catch (error: any) {
      this.logger.error(`Exception while sending WhatsApp ${type}: ${error?.message || String(error)}`);
      return {
        success: false,
        error: error?.message || 'Network error calling WhatsApp API',
      };
    }
  }

  /**
   * تحميل الوسائط (صورة، مستند، تسجيل صوتي) الواردة من Meta وحفظها محلياً على السيرفر
   */
  async downloadWhatsAppMedia(
    mediaId: string,
    mimeType?: string,
    originalFilename?: string,
    options?: { accountId?: string; phoneNumberId?: string; tenantId?: string },
  ): Promise<string | null> {
    try {
      const credentials = await this.resolveCredentials(options);
      if (!credentials?.accessToken) {
        this.logger.warn(`No access token found to download WhatsApp media ${mediaId}`);
        return null;
      }

      const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';
      const metaUrl = `https://graph.facebook.com/${apiVersion}/${mediaId}`;

      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });

      if (!metaRes.ok) {
        this.logger.error(`Failed to fetch media metadata for ${mediaId}`);
        return null;
      }

      const metaData = await metaRes.json();
      const downloadUrl = metaData?.url;
      if (!downloadUrl) return null;

      const fileRes = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'User-Agent': 'curl/7.64.1',
        },
      });

      if (!fileRes.ok) {
        this.logger.error(`Failed to download binary file for media ${mediaId}`);
        return null;
      }

      const arrayBuffer = await fileRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      let ext = '';
      const actualMime = metaData?.mime_type || mimeType || '';
      if (actualMime.includes('jpeg') || actualMime.includes('jpg')) ext = '.jpg';
      else if (actualMime.includes('png')) ext = '.png';
      else if (actualMime.includes('webp')) ext = '.webp';
      else if (actualMime.includes('pdf')) ext = '.pdf';
      else if (actualMime.includes('ogg') || actualMime.includes('opus')) ext = '.ogg';
      else if (actualMime.includes('mp4')) ext = '.mp4';
      else if (actualMime.includes('mpeg') || actualMime.includes('mp3')) ext = '.mp3';
      else if (originalFilename) ext = path.extname(originalFilename);
      else ext = '.bin';

      const filename = `${Date.now()}_wa_${mediaId}${ext}`;
      const filePath = path.join(uploadsDir, filename);

      await fs.promises.writeFile(filePath, buffer);

      const configuredBase = this.configService.get<string>('APP_URL') || this.configService.get<string>('PUBLIC_URL');
      const baseUrl = (configuredBase || '').replace(/\/$/, '');
      const mediaPath = `/api/inbox/media/${filename}`;

      return baseUrl ? `${baseUrl}${mediaPath}` : mediaPath;
    } catch (err: any) {
      this.logger.error(`Error downloading WhatsApp media ${mediaId}: ${err?.message || String(err)}`);
      return null;
    }
  }

  /**
   * إرسال رسالة قالب معتمدة (Message Template)
   * (للاستخدام خارج نافذة الـ 24 ساعة أو للإشعارات الرسمية)
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'ar',
    components?: any[],
    options?: { tenantId?: string; accountId?: string; phoneNumberId?: string },
  ): Promise<WhatsAppSendResult> {
    const cleanTo = to.replace(/[^0-9]/g, '');
    const credentials = await this.resolveCredentials(options);
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION') || 'v22.0';

    if (!credentials) {
      this.logger.warn('WhatsApp credentials missing. Template message skipped/mocked.');
      return {
        success: true,
        messageId: `mock_template_${Date.now()}`,
      };
    }

    const { accessToken, phoneNumberId } = credentials;
    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components && components.length > 0 ? { components } : {}),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp template message: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.error?.message || 'Failed to send template via WhatsApp Cloud API',
        };
      }

      const messageId = data?.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (error: any) {
      this.logger.error(`Exception while sending WhatsApp template: ${error?.message || String(error)}`);
      return {
        success: false,
        error: error?.message || 'Network error calling WhatsApp API',
      };
    }
  }

  /**
   * معالجة الحمولات الواردة من Webhook الخاص بـ Meta
   */
  async handleIncomingWebhook(body: any) {
    if (!body || body.object !== 'whatsapp_business_account') return;

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        // 1. معالجة الرسائل الواردة
        if (value.messages && value.messages.length > 0) {
          const contact = value.contacts?.[0];
          const contactName = contact?.profile?.name || 'عميل واتساب';
          const senderPhone = value.messages[0].from;
          const msgObj = value.messages[0];
          const waMsgId = msgObj.id;

          let textBody = '';
          let contentType = MessageContentType.TEXT;
          let mediaId: string | undefined;
          let mimeType: string | undefined;
          let originalFileName: string | undefined;

          if (msgObj.type === 'text') {
            textBody = msgObj.text?.body || '';
          } else if (msgObj.type === 'image') {
            contentType = MessageContentType.IMAGE;
            mediaId = msgObj.image?.id;
            mimeType = msgObj.image?.mime_type;
            textBody = msgObj.image?.caption || '[صورة]';
          } else if (msgObj.type === 'document') {
            contentType = MessageContentType.DOCUMENT;
            mediaId = msgObj.document?.id;
            mimeType = msgObj.document?.mime_type;
            originalFileName = msgObj.document?.filename;
            textBody = msgObj.document?.filename || '[مستند]';
          } else if (msgObj.type === 'audio') {
            contentType = MessageContentType.AUDIO;
            mediaId = msgObj.audio?.id;
            mimeType = msgObj.audio?.mime_type;
            textBody = '[تسجيل صوتي]';
          } else {
            textBody = `[رسالة من نوع ${msgObj.type}]`;
          }

          const recipientPhoneId = value.metadata?.phone_number_id;

          // إذا كانت الرسالة تتضمن وسائط من واتساب، نقوم بتحميلها وحفظها محلياً
          if (mediaId) {
            const savedMediaUrl = await this.downloadWhatsAppMedia(mediaId, mimeType, originalFileName, {
              phoneNumberId: recipientPhoneId,
            });
            if (savedMediaUrl) {
              textBody = savedMediaUrl;
            }
          }

          await this.processIncomingMessage(
            senderPhone,
            contactName,
            textBody,
            waMsgId,
            contentType,
            recipientPhoneId,
          );
        }

        // 2. معالجة تحديثات حالة الرسائل المرسلة (sent, delivered, read, failed)
        if (value.statuses && value.statuses.length > 0) {
          for (const statusObj of value.statuses) {
            if (statusObj.status === 'failed') {
              this.logger.error(`WhatsApp message delivery FAILED: ${statusObj.id}, errors: ${JSON.stringify(statusObj.errors || [])}`);
            }
            await this.processMessageStatus(statusObj.id, statusObj.status);
          }
        }
      }
    }
  }

  private async processIncomingMessage(
    phone: string,
    contactName: string,
    text: string,
    waMsgId: string,
    contentType: MessageContentType = MessageContentType.TEXT,
    recipientPhoneId?: string,
  ) {
    this.logger.log(`Received WhatsApp message from ${phone} to receiver ID ${recipientPhoneId || 'default'}`);

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneWithPlus = `+${cleanPhone}`;

    // البحث عن محادثة سابقة بواسطة رقم الهاتف مع أو بدون علامة الزائد
    const conversation = await this.conversationRepo
      .createQueryBuilder('c')
      .where('c.phone_number = :phone OR c.phone_number = :phoneWithPlus OR c.phone_number = :cleanPhone', {
        phone,
        phoneWithPlus,
        cleanPhone,
      })
      .leftJoinAndSelect('c.tenant', 'tenant')
      .leftJoinAndSelect('c.customer', 'customer')
      .getOne();

    let activeConversation = conversation;
    let tenantId = conversation?.tenant_id;

    if (!activeConversation) {
      // محاولة تحديد المستأجر بناءً على رقم الواتساب المستقبل (Multi-Account / Multi-Tenant)
      if (recipientPhoneId) {
        const matchedAccount = await this.accountRepo.findOne({
          where: { phone_number_id: recipientPhoneId },
        });
        if (matchedAccount) {
          tenantId = matchedAccount.tenant_id;
        }
      }

      // إذا لم يتحدد، fallback إلى أول مستأجر متاح
      if (!tenantId) {
        const anyCustomer = await this.customerRepo.findOne({ where: {} });
        tenantId = anyCustomer?.tenant_id;
      }

      if (!tenantId) {
        this.logger.warn(`Could not determine tenant_id for incoming WhatsApp message from ${phone}`);
        return;
      }

      // البحث عن العميل أو إنشاؤه تلقائياً
      let customer = await this.customerRepo
        .createQueryBuilder('cust')
        .where('cust.tenant_id = :tenantId AND (cust.phone = :phone OR cust.phone = :phoneWithPlus OR cust.phone = :cleanPhone)', {
          tenantId,
          phone,
          phoneWithPlus,
          cleanPhone,
        })
        .getOne();

      if (!customer) {
        customer = this.customerRepo.create({
          tenant_id: tenantId,
          name: contactName,
          phone: phoneWithPlus,
          city: '',
          state: '',
          source: 'WhatsApp',
        });
        await this.customerRepo.save(customer);
      }

      activeConversation = this.conversationRepo.create({
        tenant_id: tenantId,
        phone_number: phoneWithPlus,
        customer_id: customer.id,
        status: ConversationStatus.OPEN,
        last_message_at: new Date(),
      });
      await this.conversationRepo.save(activeConversation);
    }

    // إنشاء سجل الرسالة الواردة
    const msg = this.messageRepo.create({
      tenant_id: tenantId,
      conversation_id: activeConversation.id,
      direction: MessageDirection.INBOUND,
      content_type: contentType,
      content: text,
      status: MessageStatus.DELIVERED,
      whatsapp_message_id: waMsgId,
    });
    await this.messageRepo.save(msg);

    // تحديث المحادثة
    activeConversation.last_message_at = new Date();
    activeConversation.status = ConversationStatus.OPEN;
    await this.conversationRepo.save(activeConversation);

    // بث الحدث عبر WebSocket للموظفين المتصلين
    if (tenantId) {
      let snippet = msg.content;
      if (msg.content_type === MessageContentType.IMAGE) snippet = 'صورة';
      else if (msg.content_type === MessageContentType.DOCUMENT) snippet = 'مستند';
      else if (msg.content_type === MessageContentType.AUDIO) snippet = 'تسجيل صوتي';
      else if (snippet && snippet.includes('/media/')) snippet = 'صورة';

      this.inboxGateway.emitNewMessage(tenantId, msg);
      this.inboxGateway.emitConversationUpdated(tenantId, {
        ...activeConversation,
        last_message: snippet,
        last_message_status: msg.status,
        last_message_direction: msg.direction,
      } as any);
    }
  }

  private async processMessageStatus(waMsgId: string, status: string) {
    let internalStatus = MessageStatus.SENT;
    if (status === 'delivered') internalStatus = MessageStatus.DELIVERED;
    if (status === 'read') internalStatus = MessageStatus.READ;
    if (status === 'failed') internalStatus = MessageStatus.FAILED;

    const msg = await this.messageRepo.findOne({
      where: { whatsapp_message_id: waMsgId },
    });

    if (msg) {
      msg.status = internalStatus;
      await this.messageRepo.save(msg);

      if (msg.tenant_id) {
        this.inboxGateway.emitMessageStatusUpdated(msg.tenant_id, {
          messageId: msg.id,
          whatsappMessageId: waMsgId,
          status: internalStatus,
          conversationId: msg.conversation_id,
        });
      }
    } else {
      await this.messageRepo.update(
        { whatsapp_message_id: waMsgId },
        { status: internalStatus },
      );
    }

    this.logger.log(`WhatsApp message ${waMsgId} status updated to: ${status}`);
  }
}
