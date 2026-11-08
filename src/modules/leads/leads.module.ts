import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from './entities/lead.entity';
import { LeadNote } from './entities/lead-note.entity';
import { User } from '../users/entities/user.entity';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lead, LeadNote, User]),
    CustomersModule,
  ],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService, TypeOrmModule],
})
export class LeadsModule {}
