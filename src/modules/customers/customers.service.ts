import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerSearchDto } from './dto/customer-search.dto';
import { PaginatedResult } from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  /**
   * إنشاء عميل جديد ضمن نطاق المستأجر (tenant)
   */
  async create(tenantId: string, createDto: CreateCustomerDto): Promise<Customer> {
    const customer = this.customerRepository.create({
      ...createDto,
      tenant_id: tenantId,
    });
    return this.customerRepository.save(customer);
  }

  /**
   * استرجاع قائمة العملاء مع Pagination وفلترة اختيارية
   */
  async findAll(
    tenantId: string,
    query: CustomerQueryDto,
  ): Promise<PaginatedResult<Customer>> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const allowedSortFields = ['name', 'city', 'created_at', 'updated_at'];
    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'created_at';
    const sortOrder = query.sortOrder || 'DESC';

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId });

    if (query.city) {
      queryBuilder.andWhere('customer.city = :city', { city: query.city });
    }

    if (query.source) {
      queryBuilder.andWhere('customer.source = :source', { source: query.source });
    }

    queryBuilder
      .orderBy(`customer.${sortBy}`, sortOrder)
      .skip(skip)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

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
   * بحث آمن عن العملاء عبر POST body (لحماية أرقام الهواتف والعناوين الحساسة)
   */
  async search(
    tenantId: string,
    searchDto: CustomerSearchDto,
  ): Promise<Customer[]> {
    const limit = searchDto.limit || 20;
    const q = `%${searchDto.query.trim()}%`;

    return this.customerRepository
      .createQueryBuilder('customer')
      .where('customer.tenant_id = :tenantId', { tenantId })
      .andWhere(
        '(customer.name LIKE :q OR customer.phone LIKE :q OR customer.email LIKE :q OR customer.address LIKE :q OR customer.city LIKE :q)',
        { q },
      )
      .orderBy('customer.created_at', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * استرجاع تفاصيل عميل بالـ UUID مع التحقق من نطاق المستأجر
   */
  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.customerRepository.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!customer) {
      throw new NotFoundException(`العميل ذو المعرف "${id}" غير موجود`);
    }

    return customer;
  }

  /**
   * تحديث بيانات عميل
   */
  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(tenantId, id);
    Object.assign(customer, updateDto);
    return this.customerRepository.save(customer);
  }

  /**
   * حذف عميل
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const customer = await this.findOne(tenantId, id);
    await this.customerRepository.remove(customer);
  }

  /**
   * جلب نقاط العملاء لخريطة المشتركين (فقط من لديهم إحداثيات lat/lng)
   */
  async getMapPins(tenantId: string): Promise<Customer[]> {
    return this.customerRepository
      .createQueryBuilder('customer')
      .select([
        'customer.id',
        'customer.name',
        'customer.city',
        'customer.phone',
        'customer.lat',
        'customer.lng',
      ])
      .where('customer.tenant_id = :tenantId', { tenantId })
      .andWhere('customer.lat IS NOT NULL')
      .andWhere('customer.lng IS NOT NULL')
      .getMany();
  }
}
