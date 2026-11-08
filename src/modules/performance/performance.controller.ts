import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';
import { PerformanceFilterDto } from './dto/performance-filter.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('performance')
@ApiBearerAuth()
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get key performance indicators (KPIs)' })
  @ApiResponse({ status: 200, description: 'KPI data returned successfully' })
  getKpis(@TenantId() tenantId: string, @Query() filter: PerformanceFilterDto) {
    return this.performanceService.getKpis(tenantId, filter);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get sales leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard data returned successfully' })
  getLeaderboard(@TenantId() tenantId: string, @Query() filter: PerformanceFilterDto) {
    return this.performanceService.getLeaderboard(tenantId, filter);
  }
}
