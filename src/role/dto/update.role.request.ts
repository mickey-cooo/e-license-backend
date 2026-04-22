import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateBodyRoleRequestDTO {
  @ApiProperty()
  @IsString()
  @IsDefined()
  name: string;

  @ApiProperty()
  @IsDefined()
  @IsOptional()
  description: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  additionalInfo: string;

  @ApiProperty()
  @IsNumber()
  @IsDefined()
  priority: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  createdBy: string;
}
