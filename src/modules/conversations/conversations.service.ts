import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation, ConversationStatus } from './entities/conversation.entity';
import { Message, SenderType } from './entities/message.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SearchConversationsDto } from './dto/search-conversations.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async createConversation(tenantId: string, dto: CreateConversationDto): Promise<Conversation> {
    const conversation = this.conversationRepository.create({
      ...dto,
      tenant_id: tenantId,
    });
    return this.conversationRepository.save(conversation);
  }

  async findConversations(tenantId: string, searchDto: SearchConversationsDto): Promise<Conversation[]> {
    const queryBuilder = this.conversationRepository.createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.customer', 'customer')
      .where('conversation.tenant_id = :tenantId', { tenantId })
      .orderBy('conversation.last_message_at', 'DESC');

    if (searchDto.status) {
      queryBuilder.andWhere('conversation.status = :status', { status: searchDto.status });
    }

    if (searchDto.channel) {
      queryBuilder.andWhere('conversation.channel = :channel', { channel: searchDto.channel });
    }

    if (searchDto.assigned_to) {
      queryBuilder.andWhere('conversation.assigned_to = :assignedTo', { assignedTo: searchDto.assigned_to });
    }

    if (searchDto.customer_id) {
      queryBuilder.andWhere('conversation.customer_id = :customerId', { customerId: searchDto.customer_id });
    }

    return queryBuilder.getMany();
  }

  async getConversation(tenantId: string, id: string): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id, tenant_id: tenantId },
      relations: { customer: true, messages: true },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return conversation;
  }

  async sendMessage(tenantId: string, conversationId: string, dto: SendMessageDto): Promise<Message> {
    const conversation = await this.getConversation(tenantId, conversationId);

    const message = this.messageRepository.create({
      ...dto,
      tenant_id: tenantId,
      conversation_id: conversation.id,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation last_message_at
    conversation.last_message_at = new Date();
    await this.conversationRepository.save(conversation);

    return savedMessage;
  }

  async assignConversation(tenantId: string, id: string, userId: string): Promise<Conversation> {
    const conversation = await this.getConversation(tenantId, id);
    conversation.assigned_to = userId;
    return this.conversationRepository.save(conversation);
  }
}
