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
import { DocumentWorkflowService } from './document-workflow.service';
import { CreateDocumentBodyDTO } from './dto/create-document.dto';
import { QueryDocumentDTO } from './dto/query-document.dto';
import { ParamDocumentDTO } from './dto/param-document.dto';
import { UpdateDocumentBodyDTO } from './dto/update-document.dto';
import { ForwardDocumentBodyDTO } from './dto/forward-document.dto';
import { UpdateDocumentStatusBodyDTO } from './dto/update-document-status.dto';

@Controller('document-workflow')
export class DocumentWorkflowController {
  constructor(
    private readonly documentWorkflowService: DocumentWorkflowService,
  ) {}

  @Post('/create')
  async createDocument(@Body() body: CreateDocumentBodyDTO) {
    return this.documentWorkflowService.createDocument(body);
  }

  @Get('/list')
  async listDocuments(@Query() query: QueryDocumentDTO) {
    return this.documentWorkflowService.listDocuments(query);
  }

  @Get('/:id')
  async getDocumentById(@Param() param: ParamDocumentDTO) {
    return this.documentWorkflowService.getDocumentById(param);
  }

  @Patch('/update/:id')
  async updateDocument(
    @Param() param: ParamDocumentDTO,
    @Body() body: UpdateDocumentBodyDTO,
  ) {
    return this.documentWorkflowService.updateDocument(param, body);
  }

  @Delete('/delete/:id')
  async deleteDocument(@Param() param: ParamDocumentDTO) {
    return this.documentWorkflowService.deleteDocument(param);
  }

  @Patch('/forward/:id')
  async forwardDocumentToAdmin(
    @Param() param: ParamDocumentDTO,
    @Body() body: ForwardDocumentBodyDTO,
  ) {
    return this.documentWorkflowService.forwardDocumentToAdmin(param, body);
  }

  @Patch('/status/:id')
  async updateDocumentStatus(
    @Param() param: ParamDocumentDTO,
    @Body() body: UpdateDocumentStatusBodyDTO,
  ) {
    return this.documentWorkflowService.updateDocumentStatus(param, body);
  }

  @Get('/progress/:id')
  async getDocumentProgress(@Param() param: ParamDocumentDTO) {
    return this.documentWorkflowService.getDocumentProgress(param);
  }
}
