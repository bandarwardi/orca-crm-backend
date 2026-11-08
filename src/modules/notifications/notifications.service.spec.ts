import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification, NotificationStatus, NotificationCategory } from './entities/notification.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: Repository<Notification>;

  const mockTenantId = uuidv4();
  const mockUserId = uuidv4();

  const mockNotification = {
    id: uuidv4(),
    tenant_id: mockTenantId,
    user_id: mockUserId,
    title: 'Test Notification',
    description: 'This is a test',
    category: NotificationCategory.SYSTEM,
    status: NotificationStatus.UNREAD,
    created_at: new Date(),
  };

  const mockRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: uuidv4(), ...entity })),
    createQueryBuilder: vi.fn(() => ({
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockNotification]),
    })),
    findOne: vi.fn().mockResolvedValue(mockNotification),
    update: vi.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get<Repository<Notification>>(getRepositoryToken(Notification));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new notification', async () => {
      const dto = {
        user_id: mockUserId,
        title: 'New Lead Assigned',
        category: NotificationCategory.TASKS,
      };

      const result = await service.create(mockTenantId, dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        user_id: dto.user_id,
        title: dto.title,
      }));
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should update notification status to read', async () => {
      const result = await service.markAsRead(mockTenantId, mockNotification.id);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: mockNotification.id, tenant_id: mockTenantId },
      });
      expect(result.status).toEqual(NotificationStatus.READ);
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should update all unread notifications for a user to read', async () => {
      await service.markAllAsRead(mockTenantId, mockUserId);

      expect(repository.update).toHaveBeenCalledWith(
        { tenant_id: mockTenantId, user_id: mockUserId, status: NotificationStatus.UNREAD },
        { status: NotificationStatus.READ },
      );
    });
  });
});
