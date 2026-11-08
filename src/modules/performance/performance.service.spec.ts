import { Test, TestingModule } from '@nestjs/testing';
import { PerformanceService } from './performance.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

describe('PerformanceService', () => {
  let service: PerformanceService;

  const mockQueryBuilder = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue({ total: '1500.50' }),
    getRawMany: vi.fn().mockResolvedValue([
      { userId: '1', userName: 'Alice', revenue: '1000', ordersCount: '5' },
      { userId: '2', userName: 'Bob', revenue: '500', ordersCount: '2' },
    ]),
    getCount: vi.fn().mockResolvedValue(10),
  };

  const mockOrderRepository = {
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  const mockLeadRepository = {
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Lead),
          useValue: mockLeadRepository,
        },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKpis', () => {
    it('should calculate revenue, orders, leads and conversion rate', async () => {
      // Mock getCount to return 10 leads, 5 orders
      mockQueryBuilder.getCount.mockResolvedValueOnce(5).mockResolvedValueOnce(10);
      
      const result = await service.getKpis('tenant-1', {});

      expect(result.totalRevenue).toEqual(1500.50);
      expect(result.totalOrders).toEqual(5);
      expect(result.totalLeads).toEqual(10);
      expect(result.conversionRate).toEqual(50); // 5/10 * 100
    });
  });

  describe('getLeaderboard', () => {
    it('should return sorted array of user performance', async () => {
      const result = await service.getLeaderboard('tenant-1', {});

      expect(result).toHaveLength(2);
      expect(result[0].userName).toEqual('Alice');
      expect(result[0].revenue).toEqual(1000);
      expect(result[0].ordersCount).toEqual(5);
    });
  });
});
