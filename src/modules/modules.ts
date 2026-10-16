import { UserModule } from '../user/user.module';
import { MailerAppModule } from '../mailer/mailer.module';
import { LicenseAdvisoryModule } from '../license-advisory/license-advisory.module';
import { MerchantModule } from '../merchant/merchant.module';
import { DocumentWorkflowModule } from '../document-workflow/document-workflow.module';

export const modules = [
  UserModule,
  MailerAppModule,
  LicenseAdvisoryModule,
  MerchantModule,
  DocumentWorkflowModule,
];
