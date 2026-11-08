import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Device, DeviceType } from './entities/device.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SearchOrdersDto } from './dto/search-orders.dto';
import { AddDeviceDto } from './dto/add-device.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  private generateOrderNumber(): string {
    // A simple unique order number generator, e.g., ORD-YYYYMMDD-XXXX
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `ORD-${date}-${random}`;
  }

  private generateInvoiceNumber(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `INV-${date}-${random}`;
  }

  async create(tenantId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const startsAt = createOrderDto.starts_at ? new Date(createOrderDto.starts_at) : new Date();
    const duration = createOrderDto.duration_months || 12;
    
    // Calculate expires_at
    const expiresAt = new Date(startsAt.getTime());
    expiresAt.setUTCMonth(expiresAt.getUTCMonth() + duration);

    const orderNumber = this.generateOrderNumber();

    // 1. Resolve or create customer
    let customerId = createOrderDto.customer_id;
    if (!customerId && createOrderDto.customer?.phone) {
      const rawPhone = createOrderDto.customer.phone.trim();
      let customer = await this.customerRepository.findOne({
        where: { tenant_id: tenantId, phone: rawPhone },
      });

      if (!customer) {
        customer = this.customerRepository.create({
          tenant_id: tenantId,
          name: createOrderDto.customer.name?.trim() || 'عميل جديد',
          phone: rawPhone,
          email: createOrderDto.customer.email?.trim() || null,
          city: createOrderDto.customer.city?.trim() || 'غير محدد',
          address: createOrderDto.customer.address?.trim() || null,
        });
        customer = await this.customerRepository.save(customer);
      } else if (createOrderDto.customer.name && (!customer.name || customer.name === 'عميل جديد')) {
        customer.name = createOrderDto.customer.name.trim();
        if (createOrderDto.customer.email) customer.email = createOrderDto.customer.email.trim();
        if (createOrderDto.customer.city) customer.city = createOrderDto.customer.city.trim();
        if (createOrderDto.customer.address) customer.address = createOrderDto.customer.address.trim();
        await this.customerRepository.save(customer);
      }
      customerId = customer.id;
    }

    if (!customerId) {
      throw new BadRequestException('معرف العميل أو رقم هاتف العميل مطلوب لإنشاء الطلب');
    }

    // 2. Create Order
    const order = this.orderRepository.create({
      tenant_id: tenantId,
      customer_id: customerId,
      lead_id: createOrderDto.lead_id,
      assigned_to: createOrderDto.assigned_to,
      package_name: createOrderDto.package_name || `اشتراك ${duration} شهر`,
      duration_months: duration,
      allowed_devices: createOrderDto.allowed_devices || createOrderDto.devices?.length || 1,
      price: createOrderDto.price ?? 0,
      payment_method: createOrderDto.payment_method || 'بطاقة ائتمانية عبر Stripe',
      server_name: createOrderDto.server_name || 'سيرفر VIP 1',
      order_number: orderNumber,
      starts_at: startsAt,
      expires_at: expiresAt,
      status: createOrderDto.status || OrderStatus.ACTIVE,
      notes: createOrderDto.notes,
    });

    const savedOrder = await this.orderRepository.save(order);

    // 3. Create Devices if provided
    if (createOrderDto.devices && createOrderDto.devices.length > 0) {
      const typeMap: Record<string, DeviceType> = {
        'smart_tv': DeviceType.SMART_TV,
        'شاشة ذكية': DeviceType.SMART_TV,
        'android_box': DeviceType.ANDROID_BOX,
        'أندرويد بوكس': DeviceType.ANDROID_BOX,
        'firestick': DeviceType.FIRESTICK,
        'فايرستيك': DeviceType.FIRESTICK,
        'أمازون فايرستيك': DeviceType.FIRESTICK,
        'apple_tv': DeviceType.APPLE_TV,
        'أبل تي في': DeviceType.APPLE_TV,
        'mobile': DeviceType.MOBILE,
        'هاتف محمول': DeviceType.MOBILE,
        'pc': DeviceType.PC,
        'كمبيوتر': DeviceType.PC,
        'mag': DeviceType.MAG,
      };

      for (const dev of createOrderDto.devices) {
        const rawType = (dev.device_type || '').toLowerCase();
        const mappedType = typeMap[rawType] || DeviceType.SMART_TV;
        const device = this.deviceRepository.create({
          tenant_id: tenantId,
          order_id: savedOrder.id,
          customer_id: customerId,
          name: dev.name || 'جهاز مشغل',
          device_type: mappedType,
          mac_address: dev.mac_address || '—',
          device_key: dev.device_key || '—',
          username: dev.username || '—',
          app_name: dev.app_name || 'IBO Player Pro',
        });
        await this.deviceRepository.save(device);
      }
    }

    // 4. Create Payment if price > 0
    if (savedOrder.price > 0) {
      const payment = this.paymentRepository.create({
        tenant_id: tenantId,
        order_id: savedOrder.id,
        invoice_number: this.generateInvoiceNumber(),
        amount: savedOrder.price,
        status: PaymentStatus.PAID,
        payment_method: savedOrder.payment_method || 'بطاقة ائتمانية عبر Stripe',
      });
      await this.paymentRepository.save(payment);
    }

    return this.findOne(tenantId, savedOrder.id);
  }

  async search(tenantId: string, searchDto: SearchOrdersDto): Promise<Order[]> {
    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.assignedUser', 'assignedUser')
      .leftJoinAndSelect('order.devices', 'devices')
      .leftJoinAndSelect('order.payments', 'payments')
      .where('order.tenant_id = :tenantId', { tenantId });

    if (searchDto.status) {
      queryBuilder.andWhere('order.status = :status', { status: searchDto.status });
    }

    if (searchDto.customer_id) {
      queryBuilder.andWhere('order.customer_id = :customerId', { customerId: searchDto.customer_id });
    }

    if (searchDto.query) {
      queryBuilder.andWhere(
        '(order.order_number LIKE :query OR customer.name LIKE :query OR customer.phone LIKE :query)',
        { query: `%${searchDto.query}%` },
      );
    }

    return queryBuilder.getMany();
  }

  async findOne(tenantId: string, id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: {
        customer: true,
        devices: true,
        payments: true,
        assignedUser: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  async update(tenantId: string, id: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    const order = await this.findOne(tenantId, id);

    // If duration or starts_at changes, we might want to recalculate expires_at, but we'll stick to a simple merge for now
    // unless explicitly updated
    if (updateOrderDto.starts_at || updateOrderDto.duration_months) {
      const startsAt = updateOrderDto.starts_at ? new Date(updateOrderDto.starts_at) : order.starts_at;
      const duration = updateOrderDto.duration_months || order.duration_months;
      
      const expiresAt = new Date(startsAt.getTime());
      expiresAt.setUTCMonth(expiresAt.getUTCMonth() + duration);
      
      order.starts_at = startsAt;
      order.expires_at = expiresAt;
      order.duration_months = duration;
    }

    Object.assign(order, updateOrderDto);
    return this.orderRepository.save(order);
  }

  async addDevice(tenantId: string, orderId: string, addDeviceDto: AddDeviceDto): Promise<Device> {
    const order = await this.findOne(tenantId, orderId);

    const maxAllowed = order.allowed_devices ?? 1;
    if (order.devices && order.devices.length >= maxAllowed) {
      if (addDeviceDto.upgrade_slot) {
        order.allowed_devices = (order.devices.length || maxAllowed) + 1;
        await this.orderRepository.save(order);
      } else {
        throw new BadRequestException('Maximum allowed devices reached for this order');
      }
    }

    const device = this.deviceRepository.create({
      ...addDeviceDto,
      mac_address: addDeviceDto.mac_address || '—',
      device_key: addDeviceDto.device_key || '—',
      username: addDeviceDto.username || '—',
      tenant_id: tenantId,
      order_id: order.id,
      customer_id: order.customer_id,
    });

    return this.deviceRepository.save(device);
  }

  async removeDevice(tenantId: string, orderId: string, deviceId: string): Promise<void> {
    const device = await this.deviceRepository.findOne({
      where: { id: deviceId, order_id: orderId, tenant_id: tenantId },
    });

    if (!device) {
      throw new NotFoundException(`Device with ID ${deviceId} not found`);
    }

    await this.deviceRepository.remove(device);
  }

  async addPayment(tenantId: string, orderId: string, addPaymentDto: AddPaymentDto): Promise<Payment> {
    const order = await this.findOne(tenantId, orderId);

    const payment = this.paymentRepository.create({
      ...addPaymentDto,
      tenant_id: tenantId,
      order_id: order.id,
      invoice_number: this.generateInvoiceNumber(),
    });

    return this.paymentRepository.save(payment);
  }
}
