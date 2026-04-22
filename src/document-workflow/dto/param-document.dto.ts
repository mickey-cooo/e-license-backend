import { IsUUID } from 'class-validator';

export class ParamDocumentDTO {
  @IsUUID()
  id: string;
}
