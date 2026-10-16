import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const lowerCaseEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterRequestDTO {
  @ApiProperty()
  @Transform(lowerCaseEmail)
  @IsEmail()
  email: string;

  // bcrypt only uses the first 72 bytes
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ForgotPasswordDTO {
  @ApiProperty()
  @Transform(lowerCaseEmail)
  @IsEmail()
  email: string;
}
