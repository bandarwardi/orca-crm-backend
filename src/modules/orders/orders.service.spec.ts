import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Device, DeviceType, DeviceStatus } from './entities/device.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let deviceRepository: Repository<Device>;
  let paymentRepository: Repository<Payment>;

  const mockTenantId = uuidv4();
  const mockOrderId = uuidv4();

  const mockOrder = {
    id: mockOrderId,
    tenant_id: mockTenantId,
    order_number: 'ORD-20261027-1234',
    customer_id: uuidv4(),
    package_name: 'Test Package',
    duration_months: 12,
    allowed_devices: 2,
    price: 100,
    status: OrderStatus.ACTIVE,
    starts_at: new Date('2026-01-01'),
    expires_at: new Date('2027-01-01'),
    devices: [],
    payments: [],
  };

  const mockOrderRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((order) => Promise.resolve({ id: mockOrderId, ...order })),
    createQueryBuilder: vi.fn(() => ({
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getMany: vi.fn().mockResolvedValue([mockOrder]),
    })),
    findOne: vi.fn().mockResolvedValue(mockOrder),
  };

  const mockDeviceRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((device) => Promise.resolve({ id: uuidv4(), ...device })),
  };

  const mockPaymentRepository = {
    create: vi.fn().mockImplementation((dto) => dto),
    save: vi.fn().mockImplementation((payment) => Promise.resolve({ id: uuidv4(), ...payment })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: getRepositoryToken(Device),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    deviceRepository = module.get<Repository<Device>>(getRepositoryToken(Device));
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should calculate expires_at correctly and save order', async () => {
      const createOrderDto = {
        customer_id: uuidv4(),
        duration_months: 6,
        price: 50,
        starts_at: '2026-01-01T00:00:00.000Z',
      };

      const result = await service.create(mockTenantId, createOrderDto as any);

      expect(orderRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        customer_id: createOrderDto.customer_id,
        duration_months: 6,
      }));

      // Check if expires_at is correctly calculated (starts_at + 6 months)
      const expectedExpiresAt = new Date('2026-07-01T00:00:00.000Z');
      expect(result.expires_at).toEqual(expectedExpiresAt);
      expect(orderRepository.save).toHaveBeenCalled();
    });
  });

  describe('addDevice', () => {
    it('should add a device if under allowed limit', async () => {
      const addDeviceDto = {
        name: 'My TV',
        device_type: DeviceType.SMART_TV,
        mac_address: '00:11:22:33:44:55',
        device_key: 'key123',
        username: 'user123',
      };

      const result = await service.addDevice(mockTenantId, mockOrderId, addDeviceDto);

      expect(deviceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        order_id: mockOrderId,
        mac_address: '00:11:22:33:44:55',
      }));
      expect(deviceRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if device limit reached', async () => {
      mockOrderRepository.findOne.mockResolvedValueOnce({
        ...mockOrder,
        devices: [{}, {}], // Already has 2 devices, allowed_devices is 2
      });

      const addDeviceDto = {
        name: 'My Mobile',
        device_type: DeviceType.MOBILE,
        mac_address: 'AA:BB:CC:DD:EE:FF',
        device_key: 'key456',
        username: 'user456',
      };

      await expect(service.addDevice(mockTenantId, mockOrderId, addDeviceDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('addPayment', () => {
    it('should create and save a payment', async () => {
      const addPaymentDto = {
        amount: 100,
        payment_method: 'Credit Card',
      };

      const result = await service.addPayment(mockTenantId, mockOrderId, addPaymentDto);

      expect(paymentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        tenant_id: mockTenantId,
        order_id: mockOrderId,
        amount: 100,
        payment_method: 'Credit Card',
      }));
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(result.invoice_number).toBeDefined();
    });
  });
});
