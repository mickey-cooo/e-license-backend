import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentWorkflowStatus } from '../../enum/document-workflow.status';

export class UpdateDocumentStatusBodyDTO {
  @ApiProperty({ enum: DocumentWorkflowStatus })
  @IsEnum(DocumentWorkflowStatus)
  status: DocumentWorkflowStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: 'admin' })
  @IsOptional()
  @IsString()
  updatedBy?: string;
}
