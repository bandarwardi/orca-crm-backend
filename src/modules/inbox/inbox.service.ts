import { Injectable, NotFoundException, Inject, forwardRef, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { Request, Response } from 'express';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Message, MessageDirection, MessageContentType, MessageStatus } from './entities/message.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { InboxGateway } from './inbox.gateway';
import { convertToOggOpus } from '../../common/utils/audio-converter.util';

@Injectable()
export class InboxService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly inboxGateway: InboxGateway,
    private readonly configService: ConfigService,
  ) {}

  async findAllConversations(tenantId: string): Promise<any[]> {
    if (!tenantId) {
      return [];
    }
    const conversations = await this.conversationRepository.find({
      where: { tenant_id: tenantId },
      order: { last_message_at: 'DESC' },
      relations: {
        customer: true,
        lead: true,
        assignee: true,
      },
    });

    const convIds = conversations.map((c) => c.id);
    if (convIds.length === 0) return [];

    const messages = await this.messageRepository
      .createQueryBuilder('m')
      .where('m.conversation_id IN (:...convIds)', { convIds })
      .orderBy('m.created_at', 'DESC')
      .getMany();

    const lastMessageMap = new Map<string, Message>();
    for (const msg of messages) {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    }

    return conversations.map((c) => {
      const lastMsg = lastMessageMap.get(c.id);
      return {
        ...c,
        last_message: this.formatMessageSnippet(lastMsg),
        last_message_status: lastMsg ? lastMsg.status : null,
        last_message_direction: lastMsg ? lastMsg.direction : null,
      };
    });
  }

  private formatMessageSnippet(msg: Message | null | undefined): string {
    if (!msg) return '';
    if (msg.content_type === MessageContentType.IMAGE) return 'صورة';
    if (msg.content_type === MessageContentType.DOCUMENT) return 'مستند';
    if (msg.content_type === MessageContentType.AUDIO) return 'تسجيل صوتي';
    const c = msg.content || '';
    if (c.includes('/media/') && /\.(jpe?g|png|webp|gif)/i.test(c)) return 'صورة';
    if (c.includes('/media/') && /\.(ogg|opus|mp3|wav|m4a)/i.test(c)) return 'تسجيل صوتي';
    if (c.includes('/media/') && /\.(pdf|docx?|xlsx?|txt|zip)/i.test(c)) return 'مستند';
    return c;
  }

  async findConversationMessages(tenantId: string, conversationId: string): Promise<Message[]> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, tenant_id: tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    const messages = await this.messageRepository.find({
      where: { conversation_id: conversationId, tenant_id: tenantId },
      order: { created_at: 'ASC' },
    });

    for (const msg of messages) {
      if (msg.direction === MessageDirection.OUTBOUND && !msg.whatsapp_message_id && msg.status === MessageStatus.SENT) {
        msg.status = MessageStatus.FAILED;
        await this.messageRepository.save(msg);
      }
    }

    return messages;
  }

  async startConversation(
    tenantId: string,
    dto: {
      phone_number: string;
      contact_name?: string;
      content: string;
      content_type?: MessageContentType;
      whatsapp_account_id?: string;
      template_name?: string;
      template_language?: string;
    },
  ): Promise<{ conversation: Conversation; message: Message }> {
    const cleanDigits = dto.phone_number.replace(/[^0-9]/g, '');
    const phoneWithPlus = `+${cleanDigits}`;

    let conversation = await this.conversationRepository
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND (c.phone_number = :cleanDigits OR c.phone_number = :phoneWithPlus)', {
        tenantId,
        cleanDigits,
        phoneWithPlus,
      })
      .leftJoinAndSelect('c.customer', 'customer')
      .leftJoinAndSelect('c.lead', 'lead')
      .getOne();

    if (!conversation) {
      conversation = this.conversationRepository.create({
        tenant_id: tenantId,
        phone_number: phoneWithPlus,
        status: ConversationStatus.OPEN,
        last_message_at: new Date(),
      });
      conversation = await this.conversationRepository.save(conversation);
    }

    const message = await this.sendMessage(tenantId, conversation.id, {
      content: dto.content,
      content_type: dto.content_type || MessageContentType.TEXT,
      whatsapp_account_id: dto.whatsapp_account_id,
      template_name: dto.template_name,
      template_language: dto.template_language,
    });

    return { conversation, message };
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    dto: {
      content: string;
      content_type?: MessageContentType;
      whatsapp_account_id?: string;
      template_name?: string;
      template_language?: string;
      filename?: string;
      caption?: string;
    },
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, tenant_id: tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation ${conversationId} not found`);
    }

    // 1. تحديد نوع المحتوى تلقائياً إذا كان الرابط يشير لملف وسائط محلي
    let resolvedContentType = dto.content_type || MessageContentType.TEXT;
    if (resolvedContentType === MessageContentType.TEXT && dto.content) {
      const c = dto.content.trim();
      if (c.includes('/media/') || c.includes('/uploads/')) {
        if (/\.(jpe?g|png|webp|gif|bmp|avif)(\?.*)?$/i.test(c)) {
          resolvedContentType = MessageContentType.IMAGE;
        } else if (/\.(ogg|opus|mp3|wav|m4a|webm|aac)(\?.*)?$/i.test(c)) {
          resolvedContentType = MessageContentType.AUDIO;
        } else if (/\.(pdf|docx?|xlsx?|txt|zip|rar|csv)(\?.*)?$/i.test(c)) {
          resolvedContentType = MessageContentType.DOCUMENT;
        }
      }
    }

    const message = this.messageRepository.create({
      tenant_id: tenantId,
      conversation_id: conversationId,
      content: dto.content,
      content_type: resolvedContentType,
      direction: MessageDirection.OUTBOUND,
      status: MessageStatus.SENT,
    });

    let savedMessage = await this.messageRepository.save(message);

    // 2. الإرسال الفعلي عبر واتساب إذا توفر رقم هاتف للعميل
    if (conversation.phone_number) {
      let waResult;
      if (resolvedContentType === MessageContentType.TEMPLATE && dto.template_name) {
        waResult = await this.whatsappService.sendTemplateMessage(
          conversation.phone_number,
          dto.template_name,
          dto.template_language || 'ar',
          undefined,
          { tenantId, accountId: dto.whatsapp_account_id },
        );
      } else if (
        resolvedContentType === MessageContentType.IMAGE ||
        resolvedContentType === MessageContentType.DOCUMENT ||
        resolvedContentType === MessageContentType.AUDIO
      ) {
        waResult = await this.whatsappService.sendMediaMessage(
          conversation.phone_number,
          dto.content,
          resolvedContentType as any,
          dto.caption,
          dto.filename,
          { tenantId, accountId: dto.whatsapp_account_id },
        );
      } else {
        waResult = await this.whatsappService.sendTextMessage(
          conversation.phone_number,
          dto.content,
          { tenantId, accountId: dto.whatsapp_account_id },
        );
      }

      if (waResult?.success && waResult.messageId) {
        savedMessage.whatsapp_message_id = waResult.messageId;
        savedMessage.status = MessageStatus.SENT;
      } else {
        savedMessage.status = MessageStatus.FAILED;
      }
      savedMessage = await this.messageRepository.save(savedMessage);
    } else {
      savedMessage.status = MessageStatus.FAILED;
      savedMessage = await this.messageRepository.save(savedMessage);
    }

    // 3. تحديث وقت آخر رسالة في المحادثة
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    // 4. البث الفوري عبر WebSocket
    this.inboxGateway.emitNewMessage(tenantId, savedMessage);
    this.inboxGateway.emitConversationUpdated(tenantId, {
      ...conversation,
      last_message: this.formatMessageSnippet(savedMessage),
      last_message_status: savedMessage.status,
      last_message_direction: savedMessage.direction,
    } as any);

    return savedMessage;
  }

  /**
   * رفع ملف أو صورة وحفظها محلياً على السيرفر
   */
  async handleFileUpload(file: any, req: Request) {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '';
    const cleanOrigName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeFilename = `${Date.now()}_${cleanOrigName}${ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    await fs.promises.writeFile(filePath, file.buffer);

    let actualFilename = safeFilename;
    let actualMime = file.mimetype;

    const isAudio = file.mimetype?.startsWith('audio/') || /\.(ogg|opus|webm|wav|mp3|m4a|aac)$/i.test(file.originalname);
    if (isAudio) {
      const convertedPath = await convertToOggOpus(filePath);
      actualFilename = path.basename(convertedPath);
      actualMime = 'audio/ogg';
    }

    // بناء الرابط العام: إذا وجد APP_URL في .env نستخدمه، وإلا نستخدم الـ host/ngrok من الهيدرز
    const configuredBase = this.configService.get<string>('APP_URL') || this.configService.get<string>('PUBLIC_URL');
    let baseUrl = configuredBase;
    if (!baseUrl) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers['host'] || 'localhost:3000';
      baseUrl = `${proto}://${host}`;
    }

    const publicUrl = `${baseUrl.replace(/\/$/, '')}/api/inbox/media/${actualFilename}`;
    const sizeKb = Math.round(file.size / 1024);
    const sizeText = sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

    return {
      url: publicUrl,
      fileName: actualFilename,
      fileSize: sizeText,
      mimeType: actualMime,
    };
  }

  /**
   * تقديم ملفات الوسائط المخزنة
   */
  async serveMediaFile(filename: string, res: Response) {
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'uploads', safeName);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('الملف المطلوب غير موجود');
    }

    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(filePath);
  }
}
