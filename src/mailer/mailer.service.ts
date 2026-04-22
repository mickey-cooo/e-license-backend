import { Injectable } from '@nestjs/common';
import { MailderRequestDTO } from './dto/mailer.request';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailerEmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(body: MailderRequestDTO): Promise<any> {
    try {
      // Implement email sending logic here
      const { to, subject, body: htmlBody, text } = body;
      await this.mailerService.sendMail({
        to,
        subject,
        html: htmlBody,
        text,
      });

      return {
        message: 'Email sent successfully',
      };
    } catch (error) {
      throw new Error(error);
    }
  }
}
