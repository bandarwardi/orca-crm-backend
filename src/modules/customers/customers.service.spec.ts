import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomersService } from './customers.service';
import { Customer } from './entities/customer.entity';

describe('CustomersService', () => {
  let service: CustomersService;
  let mockRepo: any;

  const mockTenantId = 'tenant-123-uuid';
  const otherTenantId = 'tenant-other-uuid';

  const sampleCustomer: Partial<Customer> = {
    id: 'customer-1-uuid',
    tenant_id: mockTenantId,
    name: 'طارق منصور',
    phone: '+13135550199',
    email: 'tariq@example.com',
    city: 'Dearborn',
    state: 'MI',
    address: '13600 Michigan Ave',
    lat: 42.3223,
    lng: -83.1763,
    source: 'referral',
  };

  beforeEach(async () => {
    mockRepo = {
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((entity) => Promise.resolve({ id: 'new-id', ...entity })),
      findOne: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  describe('create', () => {
    it('should inject tenant_id and save the customer', async () => {
      const createDto = {
        name: 'طارق منصور',
        phone: '+13135550199',
        city: 'Dearborn',
      };

      const result = await service.create(mockTenantId, createDto as any);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          tenant_id: mockTenantId,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-id');
      expect(result.tenant_id).toBe(mockTenantId);
    });
  });

  describe('findOne', () => {
    it('should return customer when matching id and tenant_id', async () => {
      mockRepo.findOne.mockResolvedValue(sampleCustomer);

      const result = await service.findOne(mockTenantId, 'customer-1-uuid');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'customer-1-uuid', tenant_id: mockTenantId },
      });
      expect(result).toEqual(sampleCustomer);
    });

    it('should throw NotFoundException if customer not found in tenant', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(otherTenantId, 'customer-1-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should apply tenant_id and return paginated results', async () => {
      const qbMock: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[sampleCustomer], 1]),
      };

      mockRepo.createQueryBuilder.mockReturnValue(qbMock);

      const result = await service.findAll(mockTenantId, { page: 1, pageSize: 20 } as any);

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('customer');
      expect(qbMock.where).toHaveBeenCalledWith('customer.tenant_id = :tenantId', {
        tenantId: mockTenantId,
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.totalPages).toBe(1);
    });
  });
});
