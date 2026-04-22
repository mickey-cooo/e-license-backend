import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class ParamUserDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @IsUUID()
  id: string;
}

export class ParamUserListRequestBodyDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
