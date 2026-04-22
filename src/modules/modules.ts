import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../user/user.module';
import { MailerAppModule } from '../mailer/mailer.module';
import { PaginationModule } from '../pagination/pagination.mudule';
import { LicenseAdvisoryModule } from '../license-advisory/license-advisory.module';
import { MerchantModule } from '../merchant/merchant.module';
import { DocumentWorkflowModule } from '../document-workflow/document-workflow.module';

export const modules = [
  UserModule,
  JwtModule,
  MailerAppModule,
  PaginationModule,
  LicenseAdvisoryModule,
  MerchantModule,
  DocumentWorkflowModule,
];
