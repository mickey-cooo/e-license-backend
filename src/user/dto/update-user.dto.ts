import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class NameDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  th: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  en: string;
}

export class LastNameDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  th: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  en: string;
}

export class AddressDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  province: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  district: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  subDistrict: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  postalCode: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  detail: string;
}

export class UpdateUserBodyDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: NameDTO;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: LastNameDTO;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @Max(10)
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDTO)
  addressDetail: AddressDTO;
}
