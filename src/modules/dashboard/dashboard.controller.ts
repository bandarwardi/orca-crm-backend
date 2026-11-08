import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated dashboard summary (KPIs, Funnel, Recent Activity)' })
  @ApiResponse({ status: 200, description: 'Dashboard summary data returned successfully' })
  getSummary(@TenantId() tenantId: string, @Query() filter: DashboardFilterDto) {
    return this.dashboardService.getSummary(tenantId, filter);
  }
}
