import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { Conversation } from '../inbox/entities/conversation.entity';
import { Message } from '../inbox/entities/message.entity';
import { Customer } from '../customers/entities/customer.entity';
import { WhatsappAccount } from './entities/whatsapp-account.entity';
import { InboxModule } from '../inbox/inbox.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message, Customer, WhatsappAccount]),
    forwardRef(() => InboxModule),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
