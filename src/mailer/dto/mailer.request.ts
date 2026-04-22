import { ApiProperty } from '@nestjs/swagger';

export class MailderRequestDTO {
  @ApiProperty()
  to: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  text: string;
}
