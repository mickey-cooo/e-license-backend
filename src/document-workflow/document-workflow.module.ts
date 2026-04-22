import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentWorkflowController } from './document-workflow.controller';
import { DocumentWorkflowService } from './document-workflow.service';
import { DocumentRequestEntity } from '../database/document-request.entity';
import { DocumentProgressEntity } from '../database/document-progress.entity';
import { DocumentWorkflowGateway } from './document-workflow.gateway';
import { MerchantModule } from '../merchant/merchant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentRequestEntity, DocumentProgressEntity]),
    MerchantModule,
  ],
  controllers: [DocumentWorkflowController],
  providers: [DocumentWorkflowService, DocumentWorkflowGateway],
  exports: [DocumentWorkflowService, DocumentWorkflowGateway],
})
export class DocumentWorkflowModule {}
