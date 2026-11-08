import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetStatusDto } from './dto/set-status.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from './entities/user.entity';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users for the current tenant' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@TenantId() tenantId: string): Promise<User[]> {
    return this.usersService.findAllByTenant(tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  create(
    @TenantId() tenantId: string,
    @Body() createUserDto: CreateUserDto,
  ): Promise<User> {
    return this.usersService.create(tenantId, createUserDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.updateUser(tenantId, id, updateUserDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  setStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() setStatusDto: SetStatusDto,
  ): Promise<User> {
    return this.usersService.setActiveStatus(tenantId, id, setStatusDto.is_active);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  remove(@TenantId() tenantId: string, @Param('id') id: string): Promise<void> {
    return this.usersService.deleteUser(tenantId, id);
  }
}
