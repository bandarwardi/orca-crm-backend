import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './entities/tenant.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('settings')
  @ApiOperation({ summary: 'Get settings for the current tenant' })
  getSettings(@TenantId() tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Roles(UserRole.ADMIN)
  @Patch('settings')
  @ApiOperation({ summary: 'Update settings for the current tenant' })
  updateSettings(@TenantId() tenantId: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(tenantId, updateTenantDto);
  }

  @Roles(UserRole.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Get all tenants' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Roles(UserRole.ADMIN)
  @Get(':id')
  @ApiOperation({ summary: 'Get a tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  create(@Body() tenantData: Partial<Tenant>) {
    return this.tenantsService.create(tenantData);
  }
}

