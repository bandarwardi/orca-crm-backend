import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceService } from './performance.service';
import { PerformanceController } from './performance.controller';
import { Order } from '../orders/entities/order.entity';
import { Lead } from '../leads/entities/lead.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Lead])],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}
