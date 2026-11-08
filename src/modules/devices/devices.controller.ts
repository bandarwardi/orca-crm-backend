import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { SearchDevicesDto } from './dto/search-devices.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search devices globally (e.g. for tech support)' })
  @ApiResponse({ status: 200, description: 'List of matching devices' })
  search(@TenantId() tenantId: string, @Body() searchDto: SearchDevicesDto) {
    return this.devicesService.search(tenantId, searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get device details' })
  @ApiResponse({ status: 200, description: 'Device details' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.devicesService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update device status independently' })
  @ApiResponse({ status: 200, description: 'Device status updated' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateDeviceStatusDto,
  ) {
    return this.devicesService.updateStatus(tenantId, id, updateDto);
  }
}
