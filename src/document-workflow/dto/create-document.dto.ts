import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';

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
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  fileUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  merchantUuid?: string;
}
