import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { ELicenseMerchantType } from '../../enum/common.status';

export class UpdateMerchantBodyDTO {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  merchantName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessRegistrationNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(13, 13)
  taxId?: string;

  @ApiProperty({ enum: ELicenseMerchantType, required: false })
  @IsOptional()
  @IsEnum(ELicenseMerchantType)
  merchantType?: ELicenseMerchantType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsPhoneNumber('TH')
  contactPhoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Business activities used for license recommendations.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @IsString({ each: true })
  businessActivities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  handlesHazardousMaterial?: boolean;

  @ApiPropertyOptional({
    description:
      'Set true when the business serves or sells alcoholic beverages.',
  })
  @IsOptional()
  @IsBoolean()
  hasAlcoholService?: boolean;

  @ApiPropertyOptional({
    description: 'Set true when the business has food preparation processes.',
  })
  @IsOptional()
  @IsBoolean()
  hasFoodPreparation?: boolean;
}
