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
import { CommonStatus, ELicenseMerchantType } from '../../enum/common.status';

export class QueryMerchantDTO {
  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  offset = 0;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit = 10;

  @ApiProperty({ required: false, enum: CommonStatus })
  @IsOptional()
  @IsEnum(CommonStatus)
  status?: CommonStatus;

  @ApiProperty({ required: false, enum: ELicenseMerchantType })
  @IsOptional()
  @IsEnum(ELicenseMerchantType)
  merchantType?: ELicenseMerchantType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;
}
