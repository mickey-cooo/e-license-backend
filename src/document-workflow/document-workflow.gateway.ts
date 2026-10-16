import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DocumentWorkflowStatus } from '../enum/document-workflow.status';
import { isAdmin } from '../utils/auth/actor';

// CORS is set for all gateways by CorsIoAdapter in main.ts
@WebSocketGateway({ namespace: '/document-workflow' })
export class DocumentWorkflowGateway implements OnGatewayConnection {
  private readonly logger = new Logger(DocumentWorkflowGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwtService: JwtService) {}

  // Clients connect with io(url, { auth: { token } }). Admins join the admin
  // room, everyone joins a room for their own user id.
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      const payload = await this.jwtService.verifyAsync(token);
      client.join(`user:${payload.id}`);
      if (isAdmin(payload)) {
        client.join('admin');
      }
      client.emit('document-workflow.connected', {
        success: true,
        message: 'Connected to document workflow websocket',
      });
    } catch {
      this.logger.warn('Rejected websocket connection without a valid token');
      client.disconnect(true);
    }
  }

  emitDocumentProgressUpdate(payload: {
    documentUuid: string;
    submittedBy: string;
    status: DocumentWorkflowStatus;
    note?: string;
    notifiedTarget?: string;
    updatedBy: string;
    updatedAt: string;
  }) {
    const { submittedBy, ...event } = payload;
    const room =
      payload.notifiedTarget === 'merchant' ? `user:${submittedBy}` : 'admin';
    this.server.to(room).emit('document-workflow.progress-updated', event);
  }
}
