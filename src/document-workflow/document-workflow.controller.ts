import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../decorator/roles.decorator';
import { Token } from '../decorator/token.decorator';
import { RoleType } from '../enum/role.status';
import type { Actor } from '../utils/auth/actor';
import { DocumentWorkflowService } from './document-workflow.service';
import { CreateDocumentBodyDTO } from './dto/create-document.dto';
import { ForwardDocumentBodyDTO } from './dto/forward-document.dto';
import { ParamDocumentDTO } from './dto/param-document.dto';
import { QueryDocumentDTO } from './dto/query-document.dto';
import { UpdateDocumentStatusBodyDTO } from './dto/update-document-status.dto';
import { UpdateDocumentBodyDTO } from './dto/update-document.dto';

// Ownership (non-admins only touch documents they submitted) is checked in the service.
@ApiBearerAuth()
@Controller('document-workflow')
export class DocumentWorkflowController {
  constructor(
    private readonly documentWorkflowService: DocumentWorkflowService,
  ) {}

  @Post('/create')
  async createDocument(
    @Body() body: CreateDocumentBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.createDocument(body, actor);
  }

  @Get('/list')
  async listDocuments(@Query() query: QueryDocumentDTO, @Token() actor: Actor) {
    return this.documentWorkflowService.listDocuments(query, actor);
  }

  @Get('/progress/:id')
  async getDocumentProgress(
    @Param() param: ParamDocumentDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.getDocumentProgress(param, actor);
  }

  @Get('/:id')
  async getDocumentById(
    @Param() param: ParamDocumentDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.getDocumentById(param, actor);
  }

  @Patch('/update/:id')
  async updateDocument(
    @Param() param: ParamDocumentDTO,
    @Body() body: UpdateDocumentBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.updateDocument(param, body, actor);
  }

  @Delete('/delete/:id')
  async deleteDocument(
    @Param() param: ParamDocumentDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.deleteDocument(param, actor);
  }

  @Roles(RoleType.ADMIN)
  @Patch('/forward/:id')
  async forwardDocumentToAdmin(
    @Param() param: ParamDocumentDTO,
    @Body() body: ForwardDocumentBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.forwardDocumentToAdmin(
      param,
      body,
      actor,
    );
  }

  @Roles(RoleType.ADMIN)
  @Patch('/status/:id')
  async updateDocumentStatus(
    @Param() param: ParamDocumentDTO,
    @Body() body: UpdateDocumentStatusBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.documentWorkflowService.updateDocumentStatus(
      param,
      body,
      actor,
    );
  }
}
