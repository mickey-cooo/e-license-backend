import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../enum/common.status';

export class ReviewMerchantBodyDTO {
  @ApiProperty({ enum: [CommonStatus.APPROVED, CommonStatus.REJECTED] })
  @IsNotEmpty()
  @IsIn([CommonStatus.APPROVED, CommonStatus.REJECTED])
  status: CommonStatus.APPROVED | CommonStatus.REJECTED;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
