import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';
import { PerformanceFilterDto } from './dto/performance-filter.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {}

  async getKpis(tenantId: string, filter: PerformanceFilterDto) {
    const orderQuery = this.orderRepository.createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId });

    const leadQuery = this.leadRepository.createQueryBuilder('lead')
      .where('lead.tenant_id = :tenantId', { tenantId });

    if (filter.user_id) {
      orderQuery.andWhere('order.assigned_to = :userId', { userId: filter.user_id });
      leadQuery.andWhere('lead.assigned_to = :userId', { userId: filter.user_id });
    }

    if (filter.startDate) {
      orderQuery.andWhere('order.created_at >= :startDate', { startDate: filter.startDate });
      leadQuery.andWhere('lead.created_at >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      orderQuery.andWhere('order.created_at <= :endDate', { endDate: filter.endDate });
      leadQuery.andWhere('lead.created_at <= :endDate', { endDate: filter.endDate });
    }

    // 1. Total Revenue
    const revenueResult = await orderQuery.select('SUM(order.price)', 'total').getRawOne();
    const totalRevenue = parseFloat(revenueResult?.total || 0);

    // 2. Number of Orders
    const totalOrders = await orderQuery.getCount();

    // 3. Number of Leads
    const totalLeads = await leadQuery.getCount();

    // 4. Conversion Rate (Orders / Leads)
    const conversionRate = totalLeads > 0 ? (totalOrders / totalLeads) * 100 : 0;

    // --- Complex Metrics ---

    // Company Lead Sources
    const sourcesRaw = await this.leadRepository.createQueryBuilder('lead')
      .select('lead.source', 'source')
      .addSelect('COUNT(lead.id)', 'leadsReceived')
      .addSelect(`SUM(CASE WHEN lead.stage = 'converted' THEN 1 ELSE 0 END)`, 'leadsConverted')
      .where('lead.tenant_id = :tenantId', { tenantId })
      .groupBy('lead.source')
      .getRawMany();

    const companyLeadSources = await Promise.all(sourcesRaw.map(async (row) => {
      const source = row.source || 'other';
      const received = parseInt(row.leadsReceived, 10);
      const converted = parseInt(row.leadsConverted, 10);
      const rate = received > 0 ? (converted / received) * 100 : 0;

      // get revenue from orders for this source
      const revResult = await this.orderRepository.createQueryBuilder('order')
        .innerJoin('order.lead', 'lead')
        .where('order.tenant_id = :tenantId', { tenantId })
        .andWhere(source === 'other' ? 'lead.source IS NULL' : 'lead.source = :source', { source })
        .select('SUM(order.price)', 'total')
        .addSelect('COUNT(order.id)', 'count')
        .getRawOne();
      
      const revenue = parseFloat(revResult?.total || 0);
      const orderCountForSource = parseInt(revResult?.count || 0, 10);
      const avgValue = orderCountForSource > 0 ? revenue / orderCountForSource : 0;
      
      let icon = 'language';
      let label = source;
      
      if (source.toLowerCase().includes('whatsapp')) { icon = 'chat'; label = 'واتساب المباشر'; }
      else if (source.toLowerCase().includes('referral')) { icon = 'share'; label = 'إحالات المشتركين'; }
      else if (source.toLowerCase().includes('facebook') || source.toLowerCase().includes('social')) { icon = 'campaign'; label = 'السوشيال ميديا'; }
      else if (source.toLowerCase().includes('call')) { icon = 'phone_in_talk'; label = 'الاتصال'; }
      
      return {
        sourceType: source,
        sourceLabel: label,
        icon,
        leadsReceived: received,
        leadsConverted: converted,
        conversionRate: parseFloat(rate.toFixed(1)),
        conversionRateFormatted: `${rate.toFixed(1)}%`,
        avgDealValue: Math.round(avgValue),
        avgDealValueFormatted: `$${Math.round(avgValue)}`,
        totalRevenue: revenue,
        totalRevenueFormatted: `$${revenue}`,
        marketSharePercentage: totalLeads > 0 ? Math.round((received / totalLeads) * 100) : 0,
        trendChange: '+0%',
        trendDirection: 'up'
      };
    }));

    // Sort by conversion rate descending and set isBestPerforming
    companyLeadSources.sort((a, b) => b.conversionRate - a.conversionRate);
    if (companyLeadSources.length > 0) {
      (companyLeadSources[0] as any).isBestPerforming = true;
    }

    // Package Sales Breakdown
    const packagesRaw = await this.orderRepository.createQueryBuilder('order')
      .select('order.package_name', 'package_name')
      .addSelect('COUNT(order.id)', 'count')
      .addSelect('SUM(order.price)', 'revenue')
      .where('order.tenant_id = :tenantId', { tenantId })
      .groupBy('order.package_name')
      .getRawMany();

    const packageSales = packagesRaw.map((row, index) => {
      const count = parseInt(row.count, 10);
      const pct = totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0;
      const rev = parseFloat(row.revenue || 0);
      const colors = ['bg-primary', 'bg-secondary', 'bg-surface-tint', 'bg-brand-500'];
      return {
        name: row.package_name || 'باقة مخصصة',
        percentage: pct,
        percentageFormatted: `${pct}%`,
        revenueFormatted: `$${rev}`,
        barColorClass: colors[index % colors.length]
      };
    }).sort((a, b) => b.percentage - a.percentage);

    // 5. Unique Customers
    const uniqueCustQuery = this.orderRepository.createQueryBuilder('order')
      .where('order.tenant_id = :tenantId', { tenantId });
    if (filter.user_id) uniqueCustQuery.andWhere('order.assigned_to = :userId', { userId: filter.user_id });
    if (filter.startDate) uniqueCustQuery.andWhere('order.created_at >= :startDate', { startDate: filter.startDate });
    if (filter.endDate) uniqueCustQuery.andWhere('order.created_at <= :endDate', { endDate: filter.endDate });
    const uniqueCustResult = await uniqueCustQuery.select('COUNT(DISTINCT order.customer_id)', 'uniqueCustomers').getRawOne();
    const uniqueCustomers = parseInt(uniqueCustResult?.uniqueCustomers || 0, 10);

    // 6. Weekly trends (Last 4 weeks)
    const now = new Date();
    const weeklyTrends = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekOrders = await this.orderRepository.createQueryBuilder('order')
        .where('order.tenant_id = :tenantId', { tenantId })
        .andWhere('order.created_at >= :weekStart AND order.created_at < :weekEnd', { weekStart, weekEnd })
        .getCount();
      const weekLeads = await this.leadRepository.createQueryBuilder('lead')
        .where('lead.tenant_id = :tenantId', { tenantId })
        .andWhere('lead.created_at >= :weekStart AND lead.created_at < :weekEnd', { weekStart, weekEnd })
        .getCount();
      const weekRate = weekLeads > 0 ? (weekOrders / weekLeads) * 100 : (weekOrders > 0 ? 100 : 0);
      weeklyTrends.push({
        label: `الأسبوع ${4 - i}`,
        value: parseFloat(weekRate.toFixed(1)),
        secondaryValue: weekOrders,
      });
    }

    return {
      totalRevenue,
      totalOrders,
      totalLeads,
      uniqueCustomers,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      companyLeadSources,
      packageSales,
      weeklyTrends,
    };
  }

  async getLeaderboard(tenantId: string, filter: PerformanceFilterDto) {
    const query = this.orderRepository.createQueryBuilder('order')
      .select('user.id', 'userId')
      .addSelect('user.name', 'userName')
      .addSelect('user.role', 'userRole')
      .addSelect('SUM(order.price)', 'revenue')
      .addSelect('COUNT(order.id)', 'ordersCount')
      .addSelect('COUNT(DISTINCT order.customer_id)', 'uniqueCustomers')
      .innerJoin('order.assignedUser', 'user')
      .where('order.tenant_id = :tenantId', { tenantId })
      .groupBy('user.id')
      .addGroupBy('user.name')
      .addGroupBy('user.role')
      .orderBy('revenue', 'DESC');

    if (filter.startDate) {
      query.andWhere('order.created_at >= :startDate', { startDate: filter.startDate });
    }

    if (filter.endDate) {
      query.andWhere('order.created_at <= :endDate', { endDate: filter.endDate });
    }

    const rawResults = await query.getRawMany();

    // Get leads count per user
    const leadsQuery = this.leadRepository.createQueryBuilder('lead')
      .select('lead.assigned_to', 'userId')
      .addSelect('COUNT(lead.id)', 'leadsCount')
      .where('lead.tenant_id = :tenantId', { tenantId })
      .groupBy('lead.assigned_to');

    if (filter.startDate) {
      leadsQuery.andWhere('lead.created_at >= :startDate', { startDate: filter.startDate });
    }
    if (filter.endDate) {
      leadsQuery.andWhere('lead.created_at <= :endDate', { endDate: filter.endDate });
    }

    const leadsRaw = await leadsQuery.getRawMany();
    const leadsMap = new Map(leadsRaw.map(l => [l.userId, parseInt(l.leadsCount, 10)]));

    return rawResults.map(r => {
      const ordersCount = parseInt(r.ordersCount, 10);
      const leadsCount = leadsMap.get(r.userId) || 0;
      const conversionRate = leadsCount > 0
        ? Math.round((ordersCount / leadsCount) * 100 * 10) / 10
        : (ordersCount > 0 ? 100 : 0);

      return {
        userId: r.userId,
        userName: r.userName,
        userRole: r.userRole || 'موظف مبيعات',
        revenue: parseFloat(r.revenue || 0),
        ordersCount,
        leadsCount,
        uniqueCustomers: parseInt(r.uniqueCustomers || 0, 10),
        conversionRate,
      };
    });
  }
}
