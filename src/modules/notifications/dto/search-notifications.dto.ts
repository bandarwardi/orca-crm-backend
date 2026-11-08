import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { NotificationCategory, NotificationStatus } from '../entities/notification.entity';

export class SearchNotificationsDto {
  @ApiPropertyOptional({ enum: NotificationStatus, description: 'Filter by read/unread status' })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ enum: NotificationCategory, description: 'Filter by notification category' })
  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;
}
