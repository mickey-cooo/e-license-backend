import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { lowerCaseEmail } from './register-request.dto';

export class SignInRequestDTO {
  @ApiProperty()
  @Transform(lowerCaseEmail)
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}
