import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { SearchAuditLogsDto } from './dto/search-audit-logs.dto';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(tenantId: string, dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      ...dto,
      tenant_id: tenantId,
    });
    return this.auditLogRepository.save(auditLog);
  }

  async search(tenantId: string, searchDto: SearchAuditLogsDto): Promise<AuditLog[]> {
    const queryBuilder = this.auditLogRepository.createQueryBuilder('auditLog')
      .leftJoinAndSelect('auditLog.user', 'user')
      .where('auditLog.tenant_id = :tenantId', { tenantId })
      .orderBy('auditLog.created_at', 'DESC');

    if (searchDto.user_id) {
      queryBuilder.andWhere('auditLog.user_id = :userId', { userId: searchDto.user_id });
    }

    if (searchDto.action) {
      queryBuilder.andWhere('auditLog.action = :action', { action: searchDto.action });
    }

    if (searchDto.entity_type) {
      queryBuilder.andWhere('auditLog.entity_type = :entityType', { entityType: searchDto.entity_type });
    }

    if (searchDto.entity_id) {
      queryBuilder.andWhere('auditLog.entity_id = :entityId', { entityId: searchDto.entity_id });
    }

    return queryBuilder.getMany();
  }
}
