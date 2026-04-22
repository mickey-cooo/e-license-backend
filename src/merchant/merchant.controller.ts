import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { MerchantService } from './merchant.service';
import { CreateMerchantBodyDTO } from './dto/create-merchant.dto';
import { ParamMerchantDTO } from './dto/param-merchant.dto';
import { UpdateMerchantBodyDTO } from './dto/update-merchant.dto';
import { QueryMerchantDTO } from './dto/query-merchant.dto';
import { ReviewMerchantBodyDTO } from './dto/review-merchant.dto';
import { AnalyzeLicenseRequestDTO } from '../license-advisory/dto/analyze-license.dto';

@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('/create')
  async createMerchant(@Body() body: CreateMerchantBodyDTO) {
    return this.merchantService.createMerchant(body);
  }

  @Get('/list')
  async findAllMerchants(@Query() query: QueryMerchantDTO) {
    return this.merchantService.findAllMerchants(query);
  }

  @Get('/:id')
  async findMerchantByUuid(@Param() param: ParamMerchantDTO) {
    return this.merchantService.findMerchantByUuid(param);
  }

  @Patch('/update/:id')
  async updateMerchant(
    @Param() param: ParamMerchantDTO,
    @Body() body: UpdateMerchantBodyDTO,
  ) {
    return this.merchantService.updateMerchant(param, body);
  }

  @Delete('/delete/:id')
  async deleteMerchant(@Param() param: ParamMerchantDTO) {
    return this.merchantService.deleteMerchant(param);
  }

  @Patch('/review/:id')
  async reviewMerchant(
    @Param() param: ParamMerchantDTO,
    @Body() body: ReviewMerchantBodyDTO,
  ) {
    return this.merchantService.reviewMerchant(param, body);
  }

  @Post('/analyze-license')
  async analyzeRequiredLicenses(@Body() body: AnalyzeLicenseRequestDTO) {
    return this.merchantService.analyzeRequiredLicenses(body);
  }
}
