import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { Conversation } from './entities/conversation.entity';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/inbox',
})
export class InboxGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(InboxGateway.name);

  // Simple mapping of client ID to tenant ID. 
  // In production, token verification should happen.
  private clientTenants = new Map<string, string>();

  handleConnection(client: Socket) {
    // Basic auth logic. In reality, verify JWT here.
    const token = client.handshake.auth?.token;
    const tenantId = client.handshake.query?.tenantId as string; // For testing simplicity

    if (!tenantId) {
      this.logger.warn(`Client connected without tenantId: ${client.id}`);
      // client.disconnect(); // Uncomment for strict enforcement
      return;
    }

    this.logger.log(`Client connected: ${client.id} (Tenant: ${tenantId})`);
    this.clientTenants.set(client.id, tenantId);
    
    // Join tenant room
    client.join(`tenant_${tenantId}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientTenants.delete(client.id);
  }

  /**
   * Emits a new message event to all clients in the tenant's room
   */
  emitNewMessage(tenantId: string, message: Message) {
    this.server.to(`tenant_${tenantId}`).emit('new_message', message);
  }

  /**
   * Emits an updated conversation to all clients in the tenant's room
   */
  emitConversationUpdated(tenantId: string, conversation: Conversation) {
    this.server.to(`tenant_${tenantId}`).emit('conversation_updated', conversation);
  }

  /**
   * Emits a message status update (sent, delivered, read, failed) to all clients in the tenant's room
   */
  emitMessageStatusUpdated(
    tenantId: string,
    data: {
      messageId?: string;
      whatsappMessageId: string;
      status: string;
      conversationId?: string;
    },
  ) {
    this.server.to(`tenant_${tenantId}`).emit('message_status_updated', data);
  }
}
