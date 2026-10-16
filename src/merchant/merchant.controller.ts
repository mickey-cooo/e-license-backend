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
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public, Roles } from '../decorator/roles.decorator';
import { Token } from '../decorator/token.decorator';
import { RoleType } from '../enum/role.status';
import { AnalyzeLicenseRequestDTO } from '../license-advisory/dto/analyze-license.dto';
import type { Actor } from '../utils/auth/actor';
import { CreateMerchantBodyDTO } from './dto/create-merchant.dto';
import { ParamMerchantDTO } from './dto/param-merchant.dto';
import { QueryMerchantDTO } from './dto/query-merchant.dto';
import { ReviewMerchantBodyDTO } from './dto/review-merchant.dto';
import { UpdateMerchantBodyDTO } from './dto/update-merchant.dto';
import { MerchantService } from './merchant.service';

@ApiBearerAuth()
@Controller('merchant')
export class MerchantController {
  constructor(private readonly merchantService: MerchantService) {}

  @Post('/create')
  async createMerchant(
    @Body() body: CreateMerchantBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.merchantService.createMerchant(body, actor);
  }

  @Roles(RoleType.ADMIN)
  @Get('/list')
  async findAllMerchants(@Query() query: QueryMerchantDTO) {
    return this.merchantService.findAllMerchants(query);
  }

  @Get('/me')
  async findMyMerchant(@Token() actor: Actor) {
    return this.merchantService.findMyMerchant(actor);
  }

  @Get('/:id')
  async findMerchantByUuid(
    @Param() param: ParamMerchantDTO,
    @Token() actor: Actor,
  ) {
    return this.merchantService.findMerchantByUuid(param, actor);
  }

  @Patch('/update/:id')
  async updateMerchant(
    @Param() param: ParamMerchantDTO,
    @Body() body: UpdateMerchantBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.merchantService.updateMerchant(param, body, actor);
  }

  @Roles(RoleType.ADMIN)
  @Delete('/delete/:id')
  async deleteMerchant(
    @Param() param: ParamMerchantDTO,
    @Token() actor: Actor,
  ) {
    return this.merchantService.deleteMerchant(param, actor);
  }

  @Roles(RoleType.ADMIN)
  @Patch('/review/:id')
  async reviewMerchant(
    @Param() param: ParamMerchantDTO,
    @Body() body: ReviewMerchantBodyDTO,
    @Token() actor: Actor,
  ) {
    return this.merchantService.reviewMerchant(param, body, actor);
  }

  @Public()
  @Post('/analyze-license')
  async analyzeRequiredLicenses(@Body() body: AnalyzeLicenseRequestDTO) {
    return this.merchantService.analyzeRequiredLicenses(body);
  }
}
