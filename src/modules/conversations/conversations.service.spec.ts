import { Test, TestingModule } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Conversation, ConversationStatus, ConversationChannel } from './entities/conversation.entity';
import { Message, SenderType, MessageStatus } from './entities/message.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

describe('ConversationsService', () => {
  let service: ConversationsService;
  let convRepo: Repository<Conversation>;
  let msgRepo: Repository<Message>;

  const mockTenantId = uuidv4();
  const mockCustomerId = uuidv4();
  const mockConversationId = uuidv4();

  const mockConversation = {
    id: mockConversationId,
    tenant_id: mockTenantId,
    customer_id: mockCustomerId,
    channel: ConversationChannel.WHATSAPP,
    status: ConversationStatus.OPEN,
    last_message_at: new Date(),
  };

  const mockConvRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: mockConversationId, ...entity })),
    createQueryBuilder: vi.fn(() => ({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockConversation]),
    })),
    findOne: vi.fn().mockResolvedValue(mockConversation),
  };

  const mockMsgRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: uuidv4(), ...entity })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConvRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMsgRepository,
        },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
    convRepo = module.get<Repository<Conversation>>(getRepositoryToken(Conversation));
    msgRepo = module.get<Repository<Message>>(getRepositoryToken(Message));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const dto = {
        customer_id: mockCustomerId,
        channel: ConversationChannel.WHATSAPP,
      };

      await service.createConversation(mockTenantId, dto);

      expect(convRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        customer_id: mockCustomerId,
      }));
      expect(convRepo.save).toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should save message and update conversation last_message_at', async () => {
      const dto = {
        sender_type: SenderType.USER,
        content: 'Hello World',
      };

      const result = await service.sendMessage(mockTenantId, mockConversationId, dto);

      expect(msgRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        conversation_id: mockConversationId,
        content: 'Hello World',
      }));
      expect(msgRepo.save).toHaveBeenCalled();
      
      // Should have fetched the conversation and saved it to update last_message_at
      expect(convRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockConversationId, tenant_id: mockTenantId },
        relations: { customer: true, messages: true },
      });
      expect(convRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        id: mockConversationId,
      }));
    });
  });
});
