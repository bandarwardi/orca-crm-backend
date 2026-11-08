import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../../config/database.config';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { Lead } from '../../modules/leads/entities/lead.entity';
import { LeadNote } from '../../modules/leads/entities/lead-note.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { Device } from '../../modules/orders/entities/device.entity';
import { Payment } from '../../modules/orders/entities/payment.entity';
import { SeedService } from './seed.service';
import { TenantsModule } from '../../modules/tenants/tenants.module';
import { UsersModule } from '../../modules/users/users.module';
import { CustomersModule } from '../../modules/customers/customers.module';
import { LeadsModule } from '../../modules/leads/leads.module';
import { OrdersModule } from '../../modules/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [Tenant, User, Customer, Lead, LeadNote, Order, Device, Payment],
        autoLoadEntities: true,
        synchronize: true, // Auto-create tables for the seeder
      }),
    }),
    TenantsModule,
    UsersModule,
    CustomersModule,
    LeadsModule,
    OrdersModule,
  ],
  providers: [SeedService],
})
export class SeedModule {}
