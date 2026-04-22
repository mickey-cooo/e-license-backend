import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DocumentWorkflowStatus } from '../../enum/document-workflow.status';

export class QueryDocumentDTO {
  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  offset = 0;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit = 10;

  @ApiProperty({ required: false, enum: DocumentWorkflowStatus })
  @IsOptional()
  @IsEnum(DocumentWorkflowStatus)
  status?: DocumentWorkflowStatus;

  @ApiProperty({ required: false, description: 'Search by title' })
  @IsOptional()
  @IsString()
  keyword?: string;
}
