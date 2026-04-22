import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CommonStatus } from '../../enum/common.status';

export class ReviewMerchantBodyDTO {
  @ApiProperty({ enum: [CommonStatus.APPROVED, CommonStatus.REJECTED] })
  @IsNotEmpty()
  @IsEnum(CommonStatus)
  status: CommonStatus.APPROVED | CommonStatus.REJECTED;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
