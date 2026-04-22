import { Module } from '@nestjs/common';
import { LicenseAdvisoryController } from './license-advisory.controller';
import { LicenseAdvisoryService } from './license-advisory.service';

@Module({
  controllers: [LicenseAdvisoryController],
  providers: [LicenseAdvisoryService],
  exports: [LicenseAdvisoryService],
})
export class LicenseAdvisoryModule {}
