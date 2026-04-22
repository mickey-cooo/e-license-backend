import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { TemplateEntity } from './template.entity';
import { DocumentWorkflowStatus } from '../enum/document-workflow.status';
import { DocumentProgressEntity } from './document-progress.entity';
import { MerchantEntity } from './merchant.entity';

@Entity('document_request')
export class DocumentRequestEntity extends TemplateEntity {
  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'varchar' })
  documentType: string;

  @Column({ type: 'varchar' })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', nullable: true })
  merchantUuid?: string;

  @ManyToOne(() => MerchantEntity, (merchant) => merchant.documents, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'merchantUuid' })
  merchant?: MerchantEntity;

  @Column({ type: 'varchar' })
  submittedBy: string;

  @Column({ type: 'varchar', nullable: true })
  forwardedToAdminBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  forwardedAt?: Date;

  @Column({
    type: 'enum',
    enum: DocumentWorkflowStatus,
    default: DocumentWorkflowStatus.SUBMITTED,
  })
  status: DocumentWorkflowStatus;

  @OneToOne(
    () => DocumentProgressEntity,
    (progress) => progress.documentRequest,
    {
      cascade: true,
    },
  )
  @JoinColumn({ name: 'document_progress_uuid' })
  progressLog: DocumentProgressEntity;
}
