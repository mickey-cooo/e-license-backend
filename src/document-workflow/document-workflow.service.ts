import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DocumentProgressEntity } from '../database/document-progress.entity';
import { DocumentRequestEntity } from '../database/document-request.entity';
import {
  canTransition,
  DocumentWorkflowStatus,
} from '../enum/document-workflow.status';
import { MerchantService } from '../merchant/merchant.service';
import { type Actor, isAdmin } from '../utils/auth/actor';
import { CreateDocumentBodyDTO } from './dto/create-document.dto';
import { ForwardDocumentBodyDTO } from './dto/forward-document.dto';
import { ParamDocumentDTO } from './dto/param-document.dto';
import { QueryDocumentDTO } from './dto/query-document.dto';
import { UpdateDocumentStatusBodyDTO } from './dto/update-document-status.dto';
import { UpdateDocumentBodyDTO } from './dto/update-document.dto';
import { DocumentWorkflowGateway } from './document-workflow.gateway';

@Injectable()
export class DocumentWorkflowService {
  constructor(
    @InjectRepository(DocumentRequestEntity)
    private readonly documentRequestRepository: Repository<DocumentRequestEntity>,
    @InjectRepository(DocumentProgressEntity)
    private readonly documentProgressRepository: Repository<DocumentProgressEntity>,
    private readonly documentWorkflowGateway: DocumentWorkflowGateway,
    private readonly merchantService: MerchantService,
    private readonly dataSource: DataSource,
  ) {}

  async createDocument(body: CreateDocumentBodyDTO, actor: Actor) {
    if (body.merchantUuid) {
      await this.merchantService.assertCanAccessMerchant(
        actor,
        body.merchantUuid,
      );
    }

    const note = 'Document submitted successfully';
    const documentUuid = await this.dataSource.transaction(async (manager) => {
      const document = await manager
        .createQueryBuilder()
        .insert()
        .into(DocumentRequestEntity)
        .values({
          title: body.title,
          documentType: body.documentType,
          fileUrl: body.fileUrl,
          description: body.description,
          merchantUuid: body.merchantUuid,
          submittedBy: actor.id,
          status: DocumentWorkflowStatus.SUBMITTED,
          createdBy: actor.id,
        })
        .execute();
      const uuid = document.generatedMaps[0].uuid as string;
      await this.addProgress(manager, {
        documentRequestUuid: uuid,
        status: DocumentWorkflowStatus.SUBMITTED,
        note,
        actorId: actor.id,
        notifiedTarget: 'admin',
      });
      return uuid;
    });

    this.emitWorkflowEvent({
      documentUuid,
      submittedBy: actor.id,
      status: DocumentWorkflowStatus.SUBMITTED,
      note,
      notifiedTarget: 'admin',
      updatedBy: actor.id,
    });

    return {
      success: true,
      message: 'Document submitted successfully',
      data: { uuid: documentUuid },
    };
  }

  async listDocuments(query: QueryDocumentDTO, actor: Actor) {
    const queryBuilder = this.documentRequestRepository
      .createQueryBuilder('d')
      .where('d.status != :deletedStatus', {
        deletedStatus: DocumentWorkflowStatus.DELETED,
      });

    if (!isAdmin(actor)) {
      queryBuilder.andWhere('d.submittedBy = :actorId', { actorId: actor.id });
    }

    if (query.status) {
      queryBuilder.andWhere('d.status = :status', { status: query.status });
    }

    if (query.keyword) {
      queryBuilder.andWhere('LOWER(d.title) LIKE :keyword', {
        keyword: `%${query.keyword.trim().toLowerCase()}%`,
      });
    }

    const total = await queryBuilder.getCount();
    const documents = await queryBuilder
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
      .orderBy('d.createdAt', 'DESC')
      .offset(query.offset)
      .limit(query.limit)
      .getRawMany();

    return {
      success: true,
      message: 'Documents fetched successfully',
      data: documents,
      total,
    };
  }

  async getDocumentById(param: ParamDocumentDTO, actor: Actor) {
    const document = await this.getActiveDocument(param.id, actor);
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

  async updateDocument(
    param: ParamDocumentDTO,
    body: UpdateDocumentBodyDTO,
    actor: Actor,
  ) {
    const current = await this.getActiveDocument(param.id, actor);

    if (
      current.status === DocumentWorkflowStatus.APPROVED ||
      current.status === DocumentWorkflowStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Cannot edit document after final review result',
      );
    }
    this.assertOwnerCanChange(current, actor);

    if (body.merchantUuid) {
      await this.merchantService.assertCanAccessMerchant(
        actor,
        body.merchantUuid,
      );
    }
    const note = 'Document details updated';
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.update(
        DocumentRequestEntity,
        { uuid: current.uuid, status: current.status },
        {
          title: body.title ?? current.title,
          documentType: body.documentType ?? current.documentType,
          fileUrl: body.fileUrl ?? current.fileUrl,
          description: body.description ?? current.description,
          merchantUuid: body.merchantUuid,
          updatedBy: actor.id,
        },
      );
      this.assertStillCurrent(result.affected);
      await this.addProgress(manager, {
        documentRequestUuid: current.uuid,
        status: current.status,
        note,
        actorId: actor.id,
        notifiedTarget: 'admin',
      });
    });

    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      submittedBy: current.submittedBy,
      status: current.status,
      note,
      notifiedTarget: 'admin',
      updatedBy: actor.id,
    });

    return {
      success: true,
      message: 'Document updated successfully',
      data: { uuid: current.uuid },
    };
  }

  async deleteDocument(param: ParamDocumentDTO, actor: Actor) {
    const current = await this.getActiveDocument(param.id, actor);
    this.assertOwnerCanChange(current, actor);

    const note = 'Document removed from workflow';
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.update(
        DocumentRequestEntity,
        { uuid: current.uuid, status: current.status },
        { status: DocumentWorkflowStatus.DELETED, updatedBy: actor.id },
      );
      this.assertStillCurrent(result.affected);
      await this.addProgress(manager, {
        documentRequestUuid: current.uuid,
        status: DocumentWorkflowStatus.DELETED,
        note,
        actorId: actor.id,
        notifiedTarget: 'admin',
      });
    });

    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      submittedBy: current.submittedBy,
      status: DocumentWorkflowStatus.DELETED,
      note,
      notifiedTarget: 'admin',
      updatedBy: actor.id,
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
    actor: Actor,
  ) {
    const current = await this.getActiveDocument(param.id, actor);
    this.assertTransition(
      current.status,
      DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
    );

    const note = body.note ?? 'Forwarded to admin for review';
    await this.changeStatus(
      current,
      DocumentWorkflowStatus.FORWARDED_TO_ADMIN,
      {
        note,
        actorId: actor.id,
        notifiedTarget: 'admin',
        extra: { forwardedAt: new Date(), forwardedToAdminBy: actor.id },
      },
    );

    return {
      success: true,
      message: 'Document forwarded to admin successfully',
      data: null,
    };
  }

  async updateDocumentStatus(
    param: ParamDocumentDTO,
    body: UpdateDocumentStatusBodyDTO,
    actor: Actor,
  ) {
    const current = await this.getActiveDocument(param.id, actor);

    if (body.status === DocumentWorkflowStatus.DELETED) {
      throw new BadRequestException(
        'Use delete endpoint to remove document from workflow',
      );
    }
    if (body.status === DocumentWorkflowStatus.FORWARDED_TO_ADMIN) {
      throw new BadRequestException('Use the forward endpoint to forward');
    }
    this.assertTransition(current.status, body.status);

    await this.changeStatus(current, body.status, {
      note: body.note ?? `Status changed to ${body.status}`,
      actorId: actor.id,
      notifiedTarget: 'merchant',
    });

    return {
      success: true,
      message: 'Document status updated successfully',
      data: null,
    };
  }

  async getDocumentProgress(param: ParamDocumentDTO, actor: Actor) {
    await this.getActiveDocument(param.id, actor);
    const progress = await this.getProgressLog(param.id);

    return {
      success: true,
      message: 'Document progress fetched successfully',
      data: progress,
    };
  }

  // Once an admin has picked a document up, only admins may change or remove it,
  // so the file under review cannot be swapped and a decision cannot be erased.
  private assertOwnerCanChange(document: DocumentRequestEntity, actor: Actor) {
    if (
      !isAdmin(actor) &&
      document.status !== DocumentWorkflowStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        'Document can no longer be changed after it was forwarded for review',
      );
    }
  }

  // The status in the WHERE clause makes a concurrent change lose cleanly.
  private assertStillCurrent(affected?: number) {
    if (!affected) {
      throw new BadRequestException('Document status changed, please retry');
    }
  }

  private assertTransition(
    from: DocumentWorkflowStatus,
    to: DocumentWorkflowStatus,
  ) {
    if (!canTransition(from, to)) {
      throw new BadRequestException(
        `Cannot change status from ${from} to ${to}`,
      );
    }
  }

  // The status filter makes two admins racing on one document lose cleanly.
  private async changeStatus(
    current: DocumentRequestEntity,
    status: DocumentWorkflowStatus,
    opts: {
      note: string;
      actorId: string;
      notifiedTarget: string;
      extra?: { forwardedAt: Date; forwardedToAdminBy: string };
    },
  ) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager.update(
        DocumentRequestEntity,
        { uuid: current.uuid, status: current.status },
        { status, updatedBy: opts.actorId, ...opts.extra },
      );
      this.assertStillCurrent(result.affected);
      await this.addProgress(manager, {
        documentRequestUuid: current.uuid,
        status,
        note: opts.note,
        actorId: opts.actorId,
        notifiedTarget: opts.notifiedTarget,
      });
    });

    this.emitWorkflowEvent({
      documentUuid: current.uuid,
      submittedBy: current.submittedBy,
      status,
      note: opts.note,
      notifiedTarget: opts.notifiedTarget,
      updatedBy: opts.actorId,
    });
  }

  // Non-admins only see documents they submitted themselves.
  private async getActiveDocument(id: string, actor: Actor) {
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
    if (!isAdmin(actor) && document.submittedBy !== actor.id) {
      throw new ForbiddenException();
    }

    return document;
  }

  private async getProgressLog(documentRequestUuid: string) {
    return this.documentProgressRepository
      .createQueryBuilder('p')
      .where('p.documentRequestUuid = :documentRequestUuid', {
        documentRequestUuid,
      })
      .orderBy('p.createdAt', 'ASC')
      .getMany();
  }

  private async addProgress(
    manager: EntityManager,
    input: {
      documentRequestUuid: string;
      status: DocumentWorkflowStatus;
      note?: string;
      actorId: string;
      notifiedTarget?: string;
    },
  ) {
    await manager.insert(DocumentProgressEntity, {
      documentRequestUuid: input.documentRequestUuid,
      status: input.status,
      note: input.note,
      notifiedTarget: input.notifiedTarget,
      createdBy: input.actorId,
    });
  }

  private emitWorkflowEvent(input: {
    documentUuid: string;
    submittedBy: string;
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
