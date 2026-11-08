import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';
import { PerformanceModule } from '../performance/performance.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Lead]),
    PerformanceModule, // Import PerformanceModule to use its service
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
