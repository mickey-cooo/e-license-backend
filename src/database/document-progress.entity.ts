import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { DocumentWorkflowStatus } from '../enum/document-workflow.status';
import { DocumentRequestEntity } from './document-request.entity';

@Entity('document_progress')
export class DocumentProgressEntity extends TemplateEntity {
  @OneToOne(() => DocumentRequestEntity, (request) => request.progressLog, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_request_uuid' })
  documentRequest: DocumentRequestEntity;

  @Column({ type: 'uuid', unique: true })
  documentRequestUuid: string;

  @Column({ type: 'enum', enum: DocumentWorkflowStatus })
  status: DocumentWorkflowStatus;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'varchar', nullable: true })
  notifiedTarget?: string;
}
