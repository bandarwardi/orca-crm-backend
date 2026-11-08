import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';
import { PerformanceService } from '../performance/performance.service';
import { Repository } from 'typeorm';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockKpis = {
    totalRevenue: 5000,
    totalOrders: 20,
    totalLeads: 50,
    conversionRate: 40,
  };

  const mockPerformanceService = {
    getKpis: vi.fn().mockResolvedValue(mockKpis),
  };

  const mockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    addSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    getRawMany: vi.fn().mockResolvedValue([
      { stage: 'new', count: '10' },
      { stage: 'interested', count: '5' },
    ]),
    getMany: vi.fn().mockResolvedValue([{ id: 'order-1' }, { id: 'order-2' }]),
  };

  const mockRepository = {
    createQueryBuilder: vi.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Lead),
          useValue: mockRepository,
        },
        {
          provide: PerformanceService,
          useValue: mockPerformanceService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should aggregate KPIs, funnel, and recent activity', async () => {
      const result = await service.getSummary('tenant-1', {});

      // Assert KPIs fetched from PerformanceService
      expect(mockPerformanceService.getKpis).toHaveBeenCalledWith('tenant-1', {});
      expect(result.kpis).toEqual(mockKpis);

      // Assert funnel transformation
      expect(result.funnel).toEqual({ new: 10, interested: 5 });

      // Assert recent activity
      expect(result.recentActivity).toHaveLength(2);
    });
  });
});
