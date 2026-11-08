import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLog, AuditLogAction } from './entities/audit-log.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: Repository<AuditLog>;

  const mockTenantId = uuidv4();
  const mockUserId = uuidv4();
  const mockEntityId = uuidv4();

  const mockAuditLog = {
    id: uuidv4(),
    tenant_id: mockTenantId,
    user_id: mockUserId,
    action: AuditLogAction.UPDATE,
    entity_type: 'Order',
    entity_id: mockEntityId,
    old_values: { status: 'active' },
    new_values: { status: 'suspended' },
  };

  const mockRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: uuidv4(), ...entity })),
    createQueryBuilder: vi.fn(() => ({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockAuditLog]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get<Repository<AuditLog>>(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('should create and save an audit log', async () => {
      const dto = {
        user_id: mockUserId,
        action: AuditLogAction.UPDATE,
        entity_type: 'Order',
        entity_id: mockEntityId,
      };

      await service.logAction(mockTenantId, dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        action: AuditLogAction.UPDATE,
      }));
      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should return a list of audit logs', async () => {
      const result = await service.search(mockTenantId, { entity_type: 'Order' });
      expect(result).toEqual([mockAuditLog]);
    });
  });
});
