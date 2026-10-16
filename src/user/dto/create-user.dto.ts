import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
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

export class CreateUserBodyDTO {
  @ApiProperty({ type: NameDTO })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => NameDTO)
  name: NameDTO;

  @ApiProperty({ type: LastNameDTO })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LastNameDTO)
  lastName: LastNameDTO;

  @ApiProperty()
  @IsNotEmpty()
  @IsPhoneNumber('TH')
  phoneNumber: string;

  @ApiProperty({ type: AddressDTO })
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AddressDTO)
  addressDetail: AddressDTO;
}
