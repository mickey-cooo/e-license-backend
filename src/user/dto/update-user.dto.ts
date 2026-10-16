import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  ValidateNested,
} from 'class-validator';
import { AddressDTO, LastNameDTO, NameDTO } from './create-user.dto';

export class UpdateUserBodyDTO {
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

  @ApiPropertyOptional({ type: AddressDTO })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDTO)
  addressDetail?: AddressDTO;
}
