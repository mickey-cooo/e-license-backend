import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantEntity } from '../database/merchant.entity';
import { LicenseAdvisoryModule } from '../license-advisory/license-advisory.module';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantEntity]), LicenseAdvisoryModule],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
