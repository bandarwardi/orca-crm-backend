import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationStatus } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { SearchNotificationsDto } from './dto/search-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(tenantId: string, createDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...createDto,
      tenant_id: tenantId,
    });
    return this.notificationRepository.save(notification);
  }

  async findForUser(tenantId: string, userId: string, searchDto: SearchNotificationsDto): Promise<Notification[]> {
    const queryBuilder = this.notificationRepository.createQueryBuilder('notification')
      .where('notification.tenant_id = :tenantId', { tenantId })
      .andWhere('notification.user_id = :userId', { userId })
      .orderBy('notification.created_at', 'DESC');

    if (searchDto.status) {
      queryBuilder.andWhere('notification.status = :status', { status: searchDto.status });
    }

    if (searchDto.category) {
      queryBuilder.andWhere('notification.category = :category', { category: searchDto.category });
    }

    return queryBuilder.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async markAsRead(tenantId: string, id: string): Promise<Notification> {
    const notification = await this.findOne(tenantId, id);
    notification.status = NotificationStatus.READ;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(tenantId: string, userId: string): Promise<void> {
    await this.notificationRepository.update(
      { tenant_id: tenantId, user_id: userId, status: NotificationStatus.UNREAD },
      { status: NotificationStatus.READ },
    );
  }
}
