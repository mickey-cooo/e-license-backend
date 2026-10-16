import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { MailerEmailService } from './mailer.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('MAILER_PORT'));
        return {
          transport: {
            host: config.get<string>('MAILER_HOST'),
            port,
            secure: port === 465,
            // reset links travel by mail, so refuse a plaintext SMTP downgrade
            requireTLS: port !== 465 && config.get('NODE_ENV') === 'production',
            auth: {
              user: config.get<string>('MAILER_USER'),
              pass: config.get<string>('MAILER_PASSWORD'),
            },
          },
          defaults: {
            from:
              config.get<string>('MAILER_FROM') ??
              config.getOrThrow<string>('MAILER_USER'),
          },
        };
      },
    }),
  ],
  providers: [MailerEmailService],
  exports: [MailerEmailService],
})
export class MailerAppModule {}
