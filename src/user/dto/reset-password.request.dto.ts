import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordRequestDTO {
  @ApiProperty({ description: 'Token from the reset email link.' })
  @IsString()
  @Length(64, 64)
  token: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmNewPassword: string;
}
