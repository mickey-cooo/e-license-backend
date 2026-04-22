import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DocumentWorkflowStatus } from '../enum/document-workflow.status';

@WebSocketGateway({
  namespace: '/document-workflow',
  cors: {
    origin: process.env.FRONTEND_URL ?? '*',
    credentials: true,
  },
})
export class DocumentWorkflowGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.emit('document-workflow.connected', {
      success: true,
      message: 'Connected to document workflow websocket',
    });
  }

  handleDisconnect(_client: Socket) {}

  emitDocumentProgressUpdate(payload: {
    documentUuid: string;
    status: DocumentWorkflowStatus;
    note?: string;
    notifiedTarget?: string;
    updatedBy: string;
    updatedAt: string;
  }) {
    this.server.emit('document-workflow.progress-updated', payload);
  }
}
