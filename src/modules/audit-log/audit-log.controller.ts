import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { SearchAuditLogsDto } from './dto/search-audit-logs.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search audit logs (Admin/Supervisor only)' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  search(@TenantId() tenantId: string, @Body() searchDto: SearchAuditLogsDto) {
    return this.auditLogService.search(tenantId, searchDto);
  }
}
