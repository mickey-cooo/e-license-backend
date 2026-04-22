import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { MailerController } from './mailer.controller';
import { MailerEmailService } from './mailer.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAILER_HOST,
        port: process.env.MAILER_PORT,
        secure: true,
        auth: {
          user: process.env.MAILER_USER,
          pass: process.env.MAILER_PASSWORD,
        },
        defaults: {
          from: '<noreply@example.com>', // Default sender address
        },
        tls: {
          rejectUnauthorized: false,
        },
      },
    }),
  ],
  controllers: [MailerController],
  providers: [MailerEmailService],
  exports: [MailerEmailService],
})
export class MailerAppModule {}
