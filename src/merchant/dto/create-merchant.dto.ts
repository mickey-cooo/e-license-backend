import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';
import { ELicenseMerchantType } from '../../enum/common.status';

export class CreateMerchantBodyDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  merchantName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  businessRegistrationNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Length(13, 13)
  taxId: string;

  @ApiProperty({ enum: ELicenseMerchantType })
  @IsNotEmpty()
  @IsEnum(ELicenseMerchantType)
  merchantType: ELicenseMerchantType;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contactName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  contactEmail: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber('TH')
  contactPhoneNumber: string;

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
