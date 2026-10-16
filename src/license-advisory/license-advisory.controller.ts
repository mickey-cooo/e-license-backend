import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../decorator/roles.decorator';
import { LicenseAdvisoryService } from './license-advisory.service';
import { AnalyzeLicenseRequestDTO } from './dto/analyze-license.dto';

@Public()
@Controller('license-advisory')
export class LicenseAdvisoryController {
  constructor(
    private readonly licenseAdvisoryService: LicenseAdvisoryService,
  ) {}

  @Get('/merchant-types')
  getMerchantTypes() {
    return this.licenseAdvisoryService.getMerchantTypes();
  }

  @Post('/analyze')
  analyzeLicenses(@Body() body: AnalyzeLicenseRequestDTO) {
    return this.licenseAdvisoryService.analyzeLicenses(body);
  }
}
