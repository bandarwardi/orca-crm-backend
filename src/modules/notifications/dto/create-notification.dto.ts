import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsEnum, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { NotificationCategory, NotificationStatus } from '../entities/notification.entity';

export class CreateNotificationDto {
  @ApiProperty({ description: 'ID of the user to receive the notification' })
  @IsUUID('4')
  @IsNotEmpty()
  user_id: string;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Notification detailed description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.SYSTEM })
  @IsEnum(NotificationCategory)
  @IsOptional()
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationStatus, default: NotificationStatus.UNREAD })
  @IsEnum(NotificationStatus)
  @IsOptional()
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: 'Flag to mark notification as urgent/important' })
  @IsBoolean()
  @IsOptional()
  is_important?: boolean;

  @ApiPropertyOptional({ description: 'Entity type related to the notification (e.g. Lead, Order)' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  reference_type?: string;

  @ApiPropertyOptional({ description: 'Entity ID related to the notification' })
  @IsUUID('4')
  @IsOptional()
  reference_id?: string;
}
