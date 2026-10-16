import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class ParamUserDTO {
  @ApiProperty()
  @IsUUID()
  id: string;
}

export class ParamUserListRequestBodyDTO {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  ids: string[];
}
