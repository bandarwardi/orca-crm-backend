import { Controller, Post, Body, Get, Param, Patch, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SearchNotificationsDto } from './dto/search-notifications.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

// We assume there's a UserId decorator or we extract it from request object in a real auth scenario.
// For now, we will expect user_id as a query param or body param for testing if auth isn't fully wired to provide current user context here,
// or we can use a placeholder. Since users module exists, we should ideally get it from req.user.id.
// Assuming a decorator @CurrentUser() exists, but since we don't have its definition right now,
// we will accept user_id in the body or query for these endpoints, or simulate it.

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('my-notifications')
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  findForUser(
    @TenantId() tenantId: string,
    @Query('user_id') userId: string, // In real app, replace with @CurrentUser() user: User
    @Query() searchDto: SearchNotificationsDto,
  ) {
    return this.notificationsService.findForUser(tenantId, userId, searchDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(
    @TenantId() tenantId: string,
    @Body('user_id') userId: string, // Replace with @CurrentUser()
  ) {
    return this.notificationsService.markAllAsRead(tenantId, userId);
  }
}
