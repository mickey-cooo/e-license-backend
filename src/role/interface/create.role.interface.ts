import { ApiProperty } from '@nestjs/swagger';

export class BodyCreateRoleRequestDTO {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  additionalInfo: string;

  @ApiProperty()
  priority: number;
}
