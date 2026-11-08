import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../orders/entities/payment.entity';
import { SearchPaymentsDto } from './dto/search-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async search(tenantId: string, searchDto: SearchPaymentsDto): Promise<Payment[]> {
    const queryBuilder = this.paymentRepository.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .where('payment.tenant_id = :tenantId', { tenantId });

    if (searchDto.status) {
      queryBuilder.andWhere('payment.status = :status', { status: searchDto.status });
    }

    if (searchDto.order_id) {
      queryBuilder.andWhere('payment.order_id = :orderId', { orderId: searchDto.order_id });
    }

    if (searchDto.query) {
      queryBuilder.andWhere(
        '(payment.invoice_number LIKE :query OR payment.notes LIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  async updateStatus(tenantId: string, id: string, updateDto: UpdatePaymentStatusDto): Promise<Payment> {
    const payment = await this.findOne(tenantId, id);
    payment.status = updateDto.status;
    return this.paymentRepository.save(payment);
  }
}
