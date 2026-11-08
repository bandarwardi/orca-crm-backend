import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DevicesModule } from './modules/devices/devices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PerformanceModule } from './modules/performance/performance.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import appConfig from './config/app.config';
import { Tenant } from './modules/tenants/entities/tenant.entity';
import { User } from './modules/users/entities/user.entity';
import { Customer } from './modules/customers/entities/customer.entity';
import { Lead } from './modules/leads/entities/lead.entity';
import { LeadNote } from './modules/leads/entities/lead-note.entity';
import { Order } from './modules/orders/entities/order.entity';
import { Device } from './modules/orders/entities/device.entity';
import { Payment } from './modules/orders/entities/payment.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { Conversation } from './modules/inbox/entities/conversation.entity';
import { Message } from './modules/inbox/entities/message.entity';
import { AuditLog } from './modules/audit-log/entities/audit-log.entity';
import { WhatsappAccount } from './modules/whatsapp/entities/whatsapp-account.entity';
import { InboxModule } from './modules/inbox/inbox.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { RingcentralModule } from './modules/ringcentral/ringcentral.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig, appConfig],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute per IP
    }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [Tenant, User, Customer, Lead, LeadNote, Order, Device, Payment, Notification, Conversation, Message, AuditLog, WhatsappAccount],
        autoLoadEntities: true,
        synchronize: true, // Should be false in production, but good for setup
      }),
    }),
    TenantsModule,
    UsersModule,
    AuthModule,
    CustomersModule,
    LeadsModule,
    OrdersModule,
    DevicesModule,
    PaymentsModule,
    NotificationsModule,
    PerformanceModule,
    AuditLogModule,
    DashboardModule,
    HealthModule,
    InboxModule,
    WhatsappModule,
    RingcentralModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
