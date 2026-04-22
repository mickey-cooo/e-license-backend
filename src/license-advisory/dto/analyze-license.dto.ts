import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ELicenseMerchantType } from '../../enum/common.status';

export class AnalyzeLicenseRequestDTO {
  @ApiProperty({ enum: ELicenseMerchantType })
  @IsEnum(ELicenseMerchantType)
  merchantType: ELicenseMerchantType;

  @ApiProperty()
  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  businessActivities: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  handlesHazardousMaterial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasAlcoholService?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasFoodPreparation?: boolean;
}

export class LicenseRecommendationDTO {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  authority: string;

  @ApiProperty()
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
