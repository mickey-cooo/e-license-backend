import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ForwardDocumentBodyDTO {
  @ApiPropertyOptional({ default: 'admin-system' })
  @IsOptional()
  @IsString()
  forwardedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
