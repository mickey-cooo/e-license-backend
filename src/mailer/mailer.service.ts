import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { MailderRequestDTO } from './dto/mailer.request';

@Injectable()
export class MailerEmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail({ to, subject, body, text }: MailderRequestDTO) {
    await this.mailerService.sendMail({ to, subject, html: body, text });
    return { message: 'Email sent successfully' };
  }
}
