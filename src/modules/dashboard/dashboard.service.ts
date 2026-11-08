import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';
import { PerformanceService } from '../performance/performance.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    private readonly performanceService: PerformanceService,
  ) {}

  async getSummary(tenantId: string, filter: DashboardFilterDto) {
    // 1. Get Top-Level KPIs from PerformanceService
    const kpis: any = await this.performanceService.getKpis(tenantId, { user_id: filter.user_id });

    // Expiring orders count
    const now = new Date();
    const expiringSoon = new Date();
    expiringSoon.setDate(now.getDate() + 30);

    const expiringOrdersCount = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('(order.status = :expiringStatus OR (order.status = :activeStatus AND order.expires_at <= :expiringSoon))', {
        expiringStatus: 'expiring',
        activeStatus: 'active',
        expiringSoon
      })
      .getCount();

    kpis.expiringOrders = expiringOrdersCount;
    kpis.totalSubscriptions = await this.orderRepository.count({ where: { tenant_id: tenantId } });

    // 2. Sales Funnel (Leads grouped by stage)
    const funnelQuery = this.leadRepository.createQueryBuilder('lead')
      .select('lead.stage', 'stage')
      .addSelect('COUNT(lead.id)', 'count')
      .where('lead.tenant_id = :tenantId', { tenantId })
      .groupBy('lead.stage');

    if (filter.user_id) {
      funnelQuery.andWhere('lead.assigned_to = :userId', { userId: filter.user_id });
    }

    const funnelRaw = await funnelQuery.getRawMany();
    const funnel: Record<string, number> = {
      new: 0,
      contacted: 0,
      interested: 0,
      negotiation: 0,
      converted: 0,
      closed: 0
    };
    funnelRaw.forEach(curr => {
      if (curr.stage) {
        funnel[curr.stage] = parseInt(curr.count, 10);
      }
    });

    // 3. Recent Activity (Latest Orders)
    const recentOrdersQuery = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.tenant_id = :tenantId', { tenantId })
      .orderBy('order.created_at', 'DESC')
      .take(5);

    if (filter.user_id) {
      recentOrdersQuery.andWhere('order.assigned_to = :userId', { userId: filter.user_id });
    }

    const recentOrders = await recentOrdersQuery.getMany();

    // 4. Followups (Leads in active stages + Expiring Renewals)
    // 4a. Active Leads needing follow-up
    const leadsFollowupQuery = this.leadRepository.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.customer', 'customer')
      .where('lead.tenant_id = :tenantId', { tenantId })
      .andWhere('lead.stage NOT IN (:...stages)', { stages: ['converted', 'closed'] })
      .orderBy('lead.created_at', 'DESC')
      .take(10);

    if (filter.user_id) {
      leadsFollowupQuery.andWhere('lead.assigned_to = :userId', { userId: filter.user_id });
    }

    const leadsRaw = await leadsFollowupQuery.getMany();
    const leadFollowups = leadsRaw.map(lead => ({
      id: lead.id,
      name: lead.customer?.name || 'عميل محتمل',
      category: 'lead',
      statusType: lead.stage === 'negotiation' ? 'warning' : 'info',
      statusLabel: lead.stage === 'negotiation' ? 'مفاوضات' : lead.stage === 'interested' ? 'مهتم' : 'عميل جديد',
      phone: lead.customer?.phone || '',
      actionIcon: 'call',
      actionTitle: 'اتصال هاتفي',
      leadId: lead.id
    }));

    // 4b. Expiring Orders needing renewal
    const expiringOrdersQuery = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('order.tenant_id = :tenantId', { tenantId })
      .andWhere('(order.status = :expiringStatus OR (order.status = :activeStatus AND order.expires_at <= :expiringSoon))', {
        expiringStatus: 'expiring',
        activeStatus: 'active',
        expiringSoon
      })
      .orderBy('order.expires_at', 'ASC')
      .take(5);

    if (filter.user_id) {
      expiringOrdersQuery.andWhere('order.assigned_to = :userId', { userId: filter.user_id });
    }

    const expiringOrdersRaw = await expiringOrdersQuery.getMany();
    const renewalFollowups = expiringOrdersRaw.map(order => ({
      id: order.id,
      name: order.customer?.name || 'مشترك',
      category: 'renewal',
      statusType: 'expiring',
      statusLabel: 'تجديد اشتراك',
      phone: order.customer?.phone || '',
      actionIcon: 'sync',
      actionTitle: 'تجديد الاشتراك',
      orderId: order.id
    }));

    const allFollowups = [...renewalFollowups, ...leadFollowups];

    return {
      kpis,
      funnel,
      recentActivity: recentOrders,
      followups: allFollowups
    };
  }
}

