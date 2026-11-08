import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStage } from './entities/lead.entity';
import { LeadNote, LeadNoteType } from './entities/lead-note.entity';
import { User } from '../users/entities/user.entity';
import { CustomersService } from '../customers/customers.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStageDto } from './dto/change-stage.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { LeadSearchDto } from './dto/lead-search.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadNote)
    private readonly noteRepository: Repository<LeadNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * إنشاء عميل محتمل (Lead) وربطه بعميل موجود أو التحقق من نطاق المستأجر
   */
  async create(
    tenantId: string,
    createDto: CreateLeadDto,
    authorId?: string,
  ): Promise<Lead> {
    // التأكد من أن العميل يتبع نفس المستأجر
    await this.customersService.findOne(tenantId, createDto.customer_id);

    const lead = this.leadRepository.create({
      tenant_id: tenantId,
      customer_id: createDto.customer_id,
      assigned_to: createDto.assigned_to || null,
      stage: createDto.stage || LeadStage.NEW,
      priority: createDto.priority,
      source: createDto.source || null,
      estimated_value: createDto.estimated_value || null,
      follow_up_at: createDto.follow_up_at ? new Date(createDto.follow_up_at) : null,
    });

    const savedLead = await this.leadRepository.save(lead);

    // إضافة ملاحظة أولية إذا تم تزويدها
    if (createDto.notes && createDto.notes.trim()) {
      await this.noteRepository.save(
        this.noteRepository.create({
          tenant_id: tenantId,
          lead_id: savedLead.id,
          author_id: authorId || null,
          type: LeadNoteType.GENERAL,
          content: createDto.notes.trim(),
        }),
      );
    }

    return this.findOne(tenantId, savedLead.id);
  }

  /**
   * استرجاع قائمة الصفقات مع دعم الفلترة (المرحلة، الموظف، الأولوية) وترقيم الصفحات
   */
  async findAll(
    tenantId: string,
    query: LeadQueryDto,
  ): Promise<PaginatedResult<Lead>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const allowedSortFields = ['created_at', 'updated_at', 'estimated_value', 'stage', 'priority'];
    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'created_at';
    const sortOrder = query.sortOrder || 'DESC';

    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.customer', 'customer')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .where('lead.tenant_id = :tenantId', { tenantId });

    if (query.stage) {
      qb.andWhere('lead.stage = :stage', { stage: query.stage });
    }

    if (query.assigned_to) {
      qb.andWhere('lead.assigned_to = :assignedTo', {
        assignedTo: query.assigned_to,
      });
    }

    if (query.priority) {
      qb.andWhere('lead.priority = :priority', { priority: query.priority });
    }

    if (query.source) {
      qb.andWhere('lead.source = :source', { source: query.source });
    }

    qb.orderBy(`lead.${sortBy}`, sortOrder).skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  /**
   * بحث آمن في الصفقات والعملاء المرتبطين عبر POST body
   */
  async search(tenantId: string, searchDto: LeadSearchDto): Promise<Lead[]> {
    const limit = searchDto.limit || 20;
    const q = `%${searchDto.query.trim()}%`;

    return this.leadRepository
      .createQueryBuilder('lead')
      .leftJoinAndSelect('lead.customer', 'customer')
      .leftJoinAndSelect('lead.assignedTo', 'assignedTo')
      .where('lead.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(customer.name LIKE :q OR customer.phone LIKE :q OR customer.email LIKE :q OR customer.city LIKE :q OR lead.source LIKE :q)',
        { q },
      )
      .orderBy('lead.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * استرجاع تفاصيل صفقة مع كافة الملاحظات (Timeline)
   */
  async findOne(tenantId: string, id: string): Promise<Lead> {
    const lead = await this.leadRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: {
        customer: true,
        assignedTo: true,
        notes: {
          author: true,
        },
      },
      order: {
        notes: {
          created_at: 'ASC',
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`العميل المحتمل ذو المعرف "${id}" غير موجود`);
    }

    return lead;
  }

  /**
   * تحديث بيانات عميل محتمل
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateLeadDto,
  ): Promise<Lead> {
    const lead = await this.findOne(tenantId, id);

    if (updateDto.customer_id && updateDto.customer_id !== lead.customer_id) {
      await this.customersService.findOne(tenantId, updateDto.customer_id);
      lead.customer_id = updateDto.customer_id;
    }

    // Update associated customer details if provided
    if (lead.customer_id && (updateDto.name || updateDto.phone || updateDto.location)) {
      const custUpdate: any = {};
      if (updateDto.name) custUpdate.name = updateDto.name.trim();
      if (updateDto.phone) custUpdate.phone = updateDto.phone.trim();
      if (updateDto.location) {
        const parts = updateDto.location.split('-');
        if (parts.length > 1) {
          custUpdate.city = parts[0].trim();
          custUpdate.state = parts[1].trim();
        } else {
          custUpdate.city = updateDto.location.trim();
        }
      }
      await this.customersService.update(tenantId, lead.customer_id, custUpdate);
    }

    // Update assigned_to by rep_name if assigned_to UUID is not directly provided
    if (updateDto.rep_name && !updateDto.assigned_to) {
      const user = await this.userRepository.findOne({
        where: { name: updateDto.rep_name.trim(), tenant_id: tenantId },
      });
      if (user) {
        lead.assigned_to = user.id;
      }
    } else if (updateDto.assigned_to !== undefined) {
      lead.assigned_to = updateDto.assigned_to;
    }

    if (updateDto.stage) {
      lead.stage = updateDto.stage;
    }
    if (updateDto.priority) {
      lead.priority = updateDto.priority;
    }
    if (updateDto.source !== undefined) {
      lead.source = updateDto.source;
    }
    if (updateDto.close_reason !== undefined) {
      lead.close_reason = updateDto.close_reason;
    }
    if (updateDto.follow_up_at !== undefined) {
      lead.follow_up_at = updateDto.follow_up_at
        ? new Date(updateDto.follow_up_at)
        : null;
    }

    await this.leadRepository.save(lead);
    return this.findOne(tenantId, id);
  }

  /**
   * نقل مرحلة الكانبان وإضافة نشاط تلقائي في الـ Timeline
   */
  async changeStage(
    tenantId: string,
    id: string,
    changeStageDto: ChangeLeadStageDto,
    authorId?: string,
  ): Promise<Lead> {
    const lead = await this.findOne(tenantId, id);
    const oldStage = lead.stage;
    const newStage = changeStageDto.stage;

    lead.stage = newStage;
    if (changeStageDto.close_reason) {
      lead.close_reason = changeStageDto.close_reason;
    }

    await this.leadRepository.save(lead);

    // إضافة ملاحظة تغيير حالة في الـ Timeline
    let noteContent = `تم تغيير المرحلة من (${this.formatStageLabel(oldStage)}) إلى (${this.formatStageLabel(newStage)})`;
    if (changeStageDto.note && changeStageDto.note.trim()) {
      noteContent += ` — ${changeStageDto.note.trim()}`;
    }

    await this.noteRepository.save(
      this.noteRepository.create({
        tenant_id: tenantId,
        lead_id: lead.id,
        author_id: authorId || null,
        type: LeadNoteType.STATUS_CHANGE,
        content: noteContent,
      }),
    );

    return this.findOne(tenantId, id);
  }

  /**
   * إضافة ملاحظة جديدة في الـ Timeline
   */
  async addNote(
    tenantId: string,
    leadId: string,
    noteDto: CreateLeadNoteDto,
    authorId?: string,
  ): Promise<LeadNote> {
    await this.findOne(tenantId, leadId);

    const note = this.noteRepository.create({
      tenant_id: tenantId,
      lead_id: leadId,
      author_id: authorId || null,
      type: noteDto.type || LeadNoteType.GENERAL,
      content: noteDto.content.trim(),
    });

    return this.noteRepository.save(note);
  }

  /**
   * استرجاع جميع ملاحظات الـ Timeline الخاصة بصفقة
   */
  async getNotes(tenantId: string, leadId: string): Promise<LeadNote[]> {
    await this.findOne(tenantId, leadId);

    return this.noteRepository.find({
      where: { lead_id: leadId, tenant_id: tenantId },
      relations: { author: true },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * حذف صفقة
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const lead = await this.findOne(tenantId, id);
    await this.leadRepository.remove(lead);
  }

  private formatStageLabel(stage: LeadStage): string {
    const stageMap: Record<LeadStage, string> = {
      [LeadStage.NEW]: 'جديد',
      [LeadStage.INTERESTED]: 'مهتم',
      [LeadStage.NEGOTIATION]: 'تفاوض',
      [LeadStage.CONVERTED]: 'تم التحويل',
      [LeadStage.CLOSED]: 'مغلق',
    };
    return stageMap[stage] || stage;
  }
}
