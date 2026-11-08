import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InboxService } from './inbox.service';
import { InboxController } from './inbox.controller';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';
import { InboxGateway } from './inbox.gateway';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [InboxController],
  providers: [InboxService, InboxGateway],
  exports: [InboxGateway, InboxService],
})
export class InboxModule {}
