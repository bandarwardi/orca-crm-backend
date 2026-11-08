import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WhatsappService } from './whatsapp.service';
import { MessageDirection, MessageStatus } from '../inbox/entities/message.entity';
import * as crypto from 'crypto';

describe('WhatsappService', () => {
  let service: WhatsappService;

  const mockConfigService = {
    get: vi.fn((key: string, defaultValue?: any) => {
      switch (key) {
        case 'WHATSAPP_VERIFY_TOKEN':
          return 'test_verify_token_123';
        case 'WHATSAPP_APP_SECRET':
          return 'test_app_secret_abc';
        case 'WHATSAPP_ACCESS_TOKEN':
          return 'test_access_token';
        case 'WHATSAPP_PHONE_NUMBER_ID':
          return '1234567890';
        case 'WHATSAPP_API_VERSION':
          return 'v22.0';
        default:
          return defaultValue;
      }
    }),
  };

  const mockConversationRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((item) => Promise.resolve({ id: 'conv-uuid-1', ...item })),
  };

  const mockMessageRepo = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((item) => Promise.resolve({ id: 'msg-uuid-1', ...item })),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockCustomerRepo = {
    findOne: vi.fn(),
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((item) => Promise.resolve({ id: 'cust-uuid-1', ...item })),
  };

  const mockAccountRepo = {
    findOne: vi.fn(),
    find: vi.fn().mockResolvedValue([]),
  };

  const mockInboxGateway = {
    emitNewMessage: vi.fn(),
    emitConversationUpdated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new WhatsappService(
      mockConfigService as any,
      mockConversationRepo as any,
      mockMessageRepo as any,
      mockCustomerRepo as any,
      mockAccountRepo as any,
      mockInboxGateway as any,
    );
  });

  describe('verifyWebhookToken', () => {
    it('should return true when mode is subscribe and token matches', () => {
      const result = service.verifyWebhookToken('subscribe', 'test_verify_token_123');
      expect(result).toBe(true);
    });

    it('should return false when mode or token mismatch', () => {
      expect(service.verifyWebhookToken('subscribe', 'wrong_token')).toBe(false);
      expect(service.verifyWebhookToken('unsubscribe', 'test_verify_token_123')).toBe(false);
    });
  });

  describe('verifySignature', () => {
    it('should return true for valid sha256 HMAC signature', () => {
      const payload = Buffer.from(JSON.stringify({ test: 'data' }));
      const hash = crypto
        .createHmac('sha256', 'test_app_secret_abc')
        .update(payload)
        .digest('hex');

      const isValid = service.verifySignature(payload, `sha256=${hash}`);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = Buffer.from(JSON.stringify({ test: 'data' }));
      const isValid = service.verifySignature(payload, 'sha256=invalidhash');
      expect(isValid).toBe(false);
    });
  });

  describe('handleIncomingWebhook', () => {
    it('should parse incoming text message and emit via gateway', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({
        id: 'conv-1',
        tenant_id: 'tenant-1',
        phone_number: '123456789',
      });

      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  contacts: [{ profile: { name: 'عميل تجريبي' } }],
                  messages: [
                    {
                      from: '123456789',
                      id: 'wamid.HBgL...',
                      type: 'text',
                      text: { body: 'السلام عليكم أريد الاستفسار' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.handleIncomingWebhook(webhookPayload);

      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: MessageDirection.INBOUND,
          content: 'السلام عليكم أريد الاستفسار',
          whatsapp_message_id: 'wamid.HBgL...',
        }),
      );
      expect(mockInboxGateway.emitNewMessage).toHaveBeenCalled();
      expect(mockInboxGateway.emitConversationUpdated).toHaveBeenCalled();
    });

    it('should update status on delivery status webhook', async () => {
      const statusPayload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  statuses: [
                    {
                      id: 'wamid.HBgL...',
                      status: 'delivered',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.handleIncomingWebhook(statusPayload);

      expect(mockMessageRepo.update).toHaveBeenCalledWith(
        { whatsapp_message_id: 'wamid.HBgL...' },
        { status: MessageStatus.DELIVERED },
      );
    });
  });
});
