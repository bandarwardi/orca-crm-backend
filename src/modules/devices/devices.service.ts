import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../orders/entities/device.entity';
import { SearchDevicesDto } from './dto/search-devices.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
  ) {}

  async search(tenantId: string, searchDto: SearchDevicesDto): Promise<Device[]> {
    const queryBuilder = this.deviceRepository.createQueryBuilder('device')
      .leftJoinAndSelect('device.customer', 'customer')
      .leftJoinAndSelect('device.order', 'order')
      .where('device.tenant_id = :tenantId', { tenantId });

    if (searchDto.status) {
      queryBuilder.andWhere('device.status = :status', { status: searchDto.status });
    }

    if (searchDto.device_type) {
      queryBuilder.andWhere('device.device_type = :deviceType', { deviceType: searchDto.device_type });
    }

    if (searchDto.customer_id) {
      queryBuilder.andWhere('device.customer_id = :customerId', { customerId: searchDto.customer_id });
    }

    if (searchDto.order_id) {
      queryBuilder.andWhere('device.order_id = :orderId', { orderId: searchDto.order_id });
    }

    if (searchDto.query) {
      queryBuilder.andWhere(
        '(device.mac_address LIKE :query OR device.device_key LIKE :query OR device.username LIKE :query OR device.name LIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { customer: true, order: true },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }

    return device;
  }

  async updateStatus(tenantId: string, id: string, updateDto: UpdateDeviceStatusDto): Promise<Device> {
    const device = await this.findOne(tenantId, id);
    device.status = updateDto.status;
    return this.deviceRepository.save(device);
  }
}
