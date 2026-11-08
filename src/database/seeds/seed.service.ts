import { Injectable, Logger } from '@nestjs/common';
import { TenantsService } from '../../modules/tenants/tenants.service';
import { UsersService } from '../../modules/users/users.service';
import { CustomersService } from '../../modules/customers/customers.service';
import { LeadsService } from '../../modules/leads/leads.service';
import { OrdersService } from '../../modules/orders/orders.service';
import { LeadPriority, LeadStage } from '../../modules/leads/entities/lead.entity';
import { OrderStatus } from '../../modules/orders/entities/order.entity';
import { DeviceType } from '../../modules/orders/entities/device.entity';
import { UserRole } from '../../modules/users/entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private tenantsService: TenantsService,
    private usersService: UsersService,
    private customersService: CustomersService,
    private leadsService: LeadsService,
    private ordersService: OrdersService,
  ) { }

  async seed() {
    this.logger.log('Starting seed process...');

    // 1. Seed Tenant
    let tenant = (await this.tenantsService.findAll())[0];
    if (!tenant) {
      tenant = await this.tenantsService.create({
        name: 'orca IPTV',
        slug: 'orca-iptv',
        email: 'info@orcaiptv.example.com',
        timezone: 'US/Eastern',
      });
      this.logger.log('Created primary tenant: orca IPTV');
    } else {
      this.logger.log('Tenant already exists, skipping...');
    }

    // 2. Seed Admin User
    let admin = await this.usersService.findByEmail('admin@orcacrm.com');
    if (!admin) {
      const password_hash = await bcrypt.hash('password123', 10);
      admin = await this.usersService.create(tenant.id, {
        name: 'Admin User',
        email: 'admin@orcacrm.com',
        password: 'password123',
        role: UserRole.ADMIN,
      } as any);
      this.logger.log('Created admin user: admin@orcacrm.com');
    } else {
      this.logger.log('Admin user already exists, skipping...');
    }

    // 2.1 Seed Agent User
    let agent = await this.usersService.findByEmail('agent@mediacloud.tv');
    if (!agent) {
      const password_hash = await bcrypt.hash('password123', 10);
      agent = await this.usersService.create(tenant.id, {
        name: 'وكيل المبيعات',
        email: 'agent@mediacloud.tv',
        password: 'password123',
        role: UserRole.SALES_REP,
      } as any);
      this.logger.log('Created agent user: agent@mediacloud.tv');
    } else {
      this.logger.log('Agent user already exists, skipping...');
    }

    // 3. Seed Sample Customers
    let customersList = (await this.customersService.findAll(tenant.id, { page: 1, pageSize: 10 } as any)).data;
    if (customersList.length === 0) {
      const sampleCustomers = [
        {
          name: 'طارق منصور',
          phone: '+13135550199',
          email: 'tariq.mansour@example.com',
          city: 'Dearborn',
          state: 'MI',
          address: '13600 Michigan Ave, Dearborn, MI 48126',
          lat: 42.3223,
          lng: -83.1763,
          source: 'referral',
        },
        {
          name: 'ليلى ناصر',
          phone: '+13125550144',
          email: 'layla.nasser@example.com',
          city: 'Chicago',
          state: 'IL',
          address: '500 N Michigan Ave, Chicago, IL 60611',
          lat: 41.8781,
          lng: -87.6298,
          source: 'facebook',
        },
        {
          name: 'أحمد الشامي',
          phone: '+19735550188',
          email: 'ahmad.shami@example.com',
          city: 'Paterson',
          state: 'NJ',
          address: 'Main St, Paterson, NJ 07505',
          lat: 40.9168,
          lng: -74.1718,
          source: 'direct',
        },
        {
          name: 'سارة خليل',
          phone: '+17135550133',
          email: 'sara.khalil@example.com',
          city: 'Houston',
          state: 'TX',
          address: 'Westheimer Rd, Houston, TX 77056',
          lat: 29.7604,
          lng: -95.3698,
          source: 'whatsapp',
        },
      ];

      for (const cust of sampleCustomers) {
        await this.customersService.create(tenant.id, cust);
      }
      this.logger.log(`Created ${sampleCustomers.length} sample customers for orca IPTV`);
      customersList = (await this.customersService.findAll(tenant.id, { page: 1, pageSize: 10 } as any)).data;
    } else {
      this.logger.log('Customers already exist, skipping...');
    }

    // 4. Seed Sample Leads
    const existingLeads = await this.leadsService.findAll(tenant.id, { page: 1, pageSize: 5 } as any);
    if (existingLeads.meta.total === 0 && customersList.length >= 3) {
      await this.leadsService.create(
        tenant.id,
        {
          customer_id: customersList[0].id,
          assigned_to: admin.id,
          stage: LeadStage.INTERESTED,
          priority: LeadPriority.HIGH,
          source: 'إعلان فيسبوك',
          estimated_value: 140,
          notes: 'طلب تجربة مجانية على شاشتين، بانتظار نتيجة البث',
        },
        admin.id,
      );

      await this.leadsService.create(
        tenant.id,
        {
          customer_id: customersList[1].id,
          assigned_to: admin.id,
          stage: LeadStage.NEGOTIATION,
          priority: LeadPriority.URGENT,
          source: 'إحالة مشترك',
          estimated_value: 220,
          notes: 'تفاوض على اشتراك سنتين لجهازين، طلب خصم إضافي',
        },
        admin.id,
      );

      await this.leadsService.create(
        tenant.id,
        {
          customer_id: customersList[2].id,
          assigned_to: admin.id,
          stage: LeadStage.NEW,
          priority: LeadPriority.MEDIUM,
          source: 'تواصل مباشر',
          estimated_value: 90,
          notes: 'استفسار عن القنوات الإخبارية والرياضية والسرعة المطلوبة للإنترنت',
        },
        admin.id,
      );

      this.logger.log('Created 3 sample leads with timeline notes');
    } else {
      this.logger.log('Leads already exist, skipping...');
    }

    // 5. Seed Sample Orders
    let ordersList = await this.ordersService.search(tenant.id, {});
    if (ordersList.length === 0) {
      const order1 = await this.ordersService.create(tenant.id, {
        customer_id: customersList[0].id,
        assigned_to: admin.id,
        package_name: 'اشتراك سنة - جهازين',
        duration_months: 12,
        allowed_devices: 2,
        price: 150.00,
        payment_method: 'PayPal',
        server_name: 'Server A',
        status: OrderStatus.ACTIVE,
        notes: 'العميل مهتم بمتابعة الدوريات الرياضية',
      });

      await this.ordersService.addDevice(tenant.id, order1.id, {
        name: 'Samsung Smart TV',
        device_type: DeviceType.SMART_TV,
        mac_address: '00:1A:2B:3C:4D:5E',
        device_key: 'KEY-12345',
        username: 'tareq_samsung',
      });

      await this.ordersService.addPayment(tenant.id, order1.id, {
        amount: 150.00,
        payment_method: 'PayPal',
      });

      this.logger.log('Created sample orders with devices and payments');
    } else {
      this.logger.log('Orders already exist, skipping...');
    }

    this.logger.log('Seed process completed successfully.');
  }
}


