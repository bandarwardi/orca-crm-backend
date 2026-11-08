import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RingcentralService } from './ringcentral.service';
import { RingcentralController } from './ringcentral.controller';
import { Conversation } from '../inbox/entities/conversation.entity';
import { Message } from '../inbox/entities/message.entity';
import { Customer } from '../customers/entities/customer.entity';
import { RingcentralConfig } from './entities/ringcentral-config.entity';
import { RingcentralPhoneNumber } from './entities/ringcentral-phone-number.entity';
import { InboxModule } from '../inbox/inbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Customer, RingcentralConfig, RingcentralPhoneNumber]),
    forwardRef(() => InboxModule),
  ],
  controllers: [RingcentralController],
  providers: [RingcentralService],
  exports: [RingcentralService],
})
export class RingcentralModule {}
