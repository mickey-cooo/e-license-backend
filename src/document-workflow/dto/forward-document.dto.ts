import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ForwardDocumentBodyDTO {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
