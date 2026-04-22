import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentRequestEntity } from '../database/document-request.entity';
import { DocumentProgressEntity } from '../database/document-progress.entity';
import { CreateDocumentBodyDTO } from './dto/create-document.dto';
import { QueryDocumentDTO } from './dto/query-document.dto';
import { ParamDocumentDTO } from './dto/param-document.dto';
import { UpdateDocumentBodyDTO } from './dto/update-document.dto';
import { DocumentWorkflowStatus } from '../enum/document-workflow.status';
import { ForwardDocumentBodyDTO } from './dto/forward-document.dto';
import { UpdateDocumentStatusBodyDTO } from './dto/update-document-status.dto';
import { DocumentWorkflowGateway } from './document-workflow.gateway';
import { MerchantService } from '../merchant/merchant.service';

@Injectable()
export class DocumentWorkflowService {
  constructor(
    @InjectRepository(DocumentRequestEntity)
    private readonly documentRequestRepository: Repository<DocumentRequestEntity>,
    @InjectRepository(DocumentProgressEntity)
    private readonly documentProgressRepository: Repository<DocumentProgressEntity>,
    private readonly documentWorkflowGateway: DocumentWorkflowGateway,
    private readonly merchantService: MerchantService,
  ) {}

  async createDocument(body: CreateDocumentBodyDTO) {
    const merchantUuid = body.merchantUuid
      ? (
          await this.merchantService.getActiveMerchantByUuidOrThrow(
            body.merchantUuid,
          )
        ).uuid
      : undefined;

    const document = await this.documentRequestRepository
      .createQueryBuilder()
      .insert()
      .into(DocumentRequestEntity)
      .values({
        title: body.title,
        documentType: body.documentType,
        fileUrl: body.fileUrl,
        description: body.description,
        merchant: merchantUuid ? ({ uuid: merchantUuid } as any) : null,
        submittedBy: body.submittedBy ?? 'merchant-system',
        status: DocumentWorkflowStatus.SUBMITTED,
        createdBy: body.submittedBy ?? 'merchant-system',
        createdAt: new Date(),
      })
      .execute();

    const documentUuid = document.generatedMaps[0]?.uuid as string;
    await this.createProgressLog({
      documentRequestUuid: documentUuid,
      status: DocumentWorkflowStatus.SUBMITTED,
      note: 'Document submitted successfully',
      createdBy: body.submittedBy ?? 'merchant-system',
      notifiedTarget: 'admin',
    });
    this.emitWorkflowEvent({
      documentUuid,
      status: DocumentWorkflowStatus.SUBMITTED,
      note: 'Document submitted successfully',
      notifiedTarget: 'admin',
      updatedBy: body.submittedBy ?? 'merchant-system',
    });

    return {
      success: true,
      message: 'Document submitted successfully',
      data: document.generatedMaps[0],
    };
  }

  async listDocuments(query: QueryDocumentDTO) {
    const queryBuilder = this.documentRequestRepository
      .createQueryBuilder('d')
      .select([
        'd.uuid AS "uuid"',
        'd.title AS "title"',
        'd.documentType AS "documentType"',
        'd.fileUrl AS "fileUrl"',
        'd.description AS "description"',
        'd.merchantUuid AS "merchantUuid"',
        'd.submittedBy AS "submittedBy"',
        'd.forwardedToAdminBy AS "forwardedToAdminBy"',
        'd.forwardedAt AS "forwardedAt"',
        'd.status AS "status"',
        'd.createdAt AS "createdAt"',
        'd.updatedAt AS "updatedAt"',
      ])
      .where('d.status != :deletedStatus', {
        deletedStatus: DocumentWorkflowStatus.DELETED,
      })
      .orderBy('d.createdAt', 'DESC');

    if (query.status) {
      queryBuilder.andWhere('d.status = :status', { status: query.status });
    }

    if (query.keyword) {
      queryBuilder.andWhere('LOWER(d.title) LIKE :keyword', {
        keyword: `%${query.keyword.trim().toLowerCase()}%`,
      });
    }

    const documents = await queryBuilder
      .skip(query.offset)
      .take(query.limit)
      .getRawMany();

    return {
      success: true,
      message: 'Documents fetched successfully',
      data: documents,
    };
  }

  async getDocumentById(param: ParamDocumentDTO) {
    const document = await this.getActiveDocument(param.id);
    const progress = await this.getProgressLog(param.id);

    return {
      success: true,
      message: 'Document fetched successfully',
      data: {
        ...document,
        progress,
      },
    };
  }

  async updateDocument(param: ParamDocumentDTO, body: UpdateDocumentBodyDTO) {
    const current = await this.getActiveDocument(param.id);
    const merchantUuid = body.merchantUuid
      ? (
          await this.merchantService.getActiveMerchantByUuidOrThrow(
            body.merchantUuid,
          )
        ).uuid
      : current.merchantUuid;

    if (
      current.status === DocumentWorkflowStatus.APPROVED ||
      current.status === DocumentWorkflowStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Cannot edit document after final review result',
      );
    }

    await this.documentRequestRepository
      .createQueryBuilder()
      .update(DocumentRequestEntity)
      .set({
        title: body.title ?? current.title,
        documentType: body.documentType ?? current.documentType,
        fileUrl: body.fileUrl ?? current.fileUrl,
        description: body.description ?? current.description,
        merchant: merchantUuid ? ({ uuid: merchantUuid } as any) : null,
        updatedBy: 'merchant-system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: current.uuid })
      .execute();

    await this.createProgressLog({
      documentRequestUuid: current.uuid,
      status: current.status,
      note: 'Document details updated',
      createdBy: 'merchant-system',
      notifiedTarget: 'admin',
    });
    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      status: current.status,
      note: 'Document details updated',
      notifiedTarget: 'admin',
      updatedBy: 'merchant-system',
    });

    return {
      success: true,
      message: 'Document updated successfully',
      data: { uuid: current.uuid },
    };
  }

  async deleteDocument(param: ParamDocumentDTO) {
    const current = await this.getActiveDocument(param.id);

    await this.documentRequestRepository
      .createQueryBuilder()
      .update(DocumentRequestEntity)
      .set({
        status: DocumentWorkflowStatus.DELETED,
        updatedBy: 'system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: current.uuid })
      .execute();

    await this.createProgressLog({
      documentRequestUuid: current.uuid,
      status: DocumentWorkflowStatus.DELETED,
      note: 'Document removed from workflow',
      createdBy: 'system',
      notifiedTarget: 'admin',
    });
    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      status: DocumentWorkflowStatus.DELETED,
      note: 'Document removed from workflow',
      notifiedTarget: 'admin',
      updatedBy: 'system',
    });

    return {
      success: true,
      message: 'Document deleted successfully',
      data: null,
    };
  }

  async forwardDocumentToAdmin(
    param: ParamDocumentDTO,
    body: ForwardDocumentBodyDTO,
  ) {
    const current = await this.getActiveDocument(param.id);

    if (current.status === DocumentWorkflowStatus.FORWARDED_TO_ADMIN) {
      throw new BadRequestException('Document already forwarded to admin');
    }

    await this.documentRequestRepository
      .createQueryBuilder()
      .update(DocumentRequestEntity)
      .set({
        status: DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
        forwardedAt: new Date(),
        forwardedToAdminBy: body.forwardedBy ?? 'admin-system',
        updatedBy: body.forwardedBy ?? 'admin-system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: current.uuid })
      .execute();

    await this.createProgressLog({
      documentRequestUuid: current.uuid,
      status: DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
      note: body.note ?? 'Forwarded to admin for review',
      createdBy: body.forwardedBy ?? 'admin-system',
      notifiedTarget: 'admin',
    });
    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      status: DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
      note: body.note ?? 'Forwarded to admin for review',
      notifiedTarget: 'admin',
      updatedBy: body.forwardedBy ?? 'admin-system',
    });

    return {
      success: true,
      message: 'Document forwarded to admin successfully',
      data: null,
    };
  }

  async updateDocumentStatus(
    param: ParamDocumentDTO,
    body: UpdateDocumentStatusBodyDTO,
  ) {
    const current = await this.getActiveDocument(param.id);

    if (body.status === DocumentWorkflowStatus.DELETED) {
      throw new BadRequestException(
        'Use delete endpoint to remove document from workflow',
      );
    }

    await this.documentRequestRepository
      .createQueryBuilder()
      .update(DocumentRequestEntity)
      .set({
        status: body.status,
        updatedBy: body.updatedBy ?? 'admin-system',
        updatedAt: new Date(),
      })
      .where('uuid = :uuid', { uuid: current.uuid })
      .execute();

    await this.createProgressLog({
      documentRequestUuid: current.uuid,
      status: body.status,
      note: body.note ?? `Status changed to ${body.status}`,
      createdBy: body.updatedBy ?? 'admin-system',
      notifiedTarget: 'merchant',
    });
    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      status: body.status,
      note: body.note ?? `Status changed to ${body.status}`,
      notifiedTarget: 'merchant',
      updatedBy: body.updatedBy ?? 'admin-system',
    });

    return {
      success: true,
      message: 'Document status updated successfully',
      data: null,
    };
  }

  async getDocumentProgress(param: ParamDocumentDTO) {
    await this.getActiveDocument(param.id);
    const progress = await this.getProgressLog(param.id);

    return {
      success: true,
      message: 'Document progress fetched successfully',
      data: progress,
    };
  }

  private async getActiveDocument(id: string) {
    const document = await this.documentRequestRepository
      .createQueryBuilder('d')
      .where('d.uuid = :id', { id })
      .andWhere('d.status != :deletedStatus', {
        deletedStatus: DocumentWorkflowStatus.DELETED,
      })
      .getOne();

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  private async getProgressLog(documentRequestUuid: string) {
    return this.documentProgressRepository
      .createQueryBuilder('p')
      .where('p.documentRequestUuid = :documentRequestUuid', {
        documentRequestUuid,
      })
      .getOne();
  }

  private async createProgressLog(input: {
    documentRequestUuid: string;
    status: DocumentWorkflowStatus;
    note?: string;
    createdBy: string;
    notifiedTarget?: string;
  }) {
    const existingProgress = await this.documentProgressRepository
      .createQueryBuilder('p')
      .where('p.documentRequestUuid = :documentRequestUuid', {
        documentRequestUuid: input.documentRequestUuid,
      })
      .getOne();

    if (existingProgress) {
      return this.documentProgressRepository
        .createQueryBuilder()
        .update(DocumentProgressEntity)
        .set({
          status: input.status,
          note: input.note,
          notifiedTarget: input.notifiedTarget,
          updatedBy: input.createdBy,
          updatedAt: new Date(),
        })
        .where('uuid = :uuid', { uuid: existingProgress.uuid })
        .execute();
    }

    return this.documentProgressRepository
      .createQueryBuilder()
      .insert()
      .into(DocumentProgressEntity)
      .values({
        documentRequestUuid: input.documentRequestUuid,
        status: input.status,
        note: input.note,
        createdBy: input.createdBy,
        createdAt: new Date(),
        notifiedTarget: input.notifiedTarget,
      })
      .execute();
  }

  private emitWorkflowEvent(input: {
    documentUuid: string;
    status: DocumentWorkflowStatus;
    note?: string;
    notifiedTarget?: string;
    updatedBy: string;
  }) {
    this.documentWorkflowGateway.emitDocumentProgressUpdate({
      ...input,
      updatedAt: new Date().toISOString(),
    });
  }
}
