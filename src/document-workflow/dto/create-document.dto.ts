import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDocumentBodyDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  documentType: string;

  @ApiProperty({
    description: 'Document location URL such as S3/drive URL.',
  })
  @IsNotEmpty()
  @IsString()
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  merchantUuid?: string;

  @ApiPropertyOptional({ default: 'merchant-system' })
  @IsOptional()
  @IsString()
  submittedBy?: string;
}
