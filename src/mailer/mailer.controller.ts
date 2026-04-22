import { Body, Controller, Post } from '@nestjs/common';
import { MailerEmailService } from './mailer.service';
import { MailderRequestDTO } from './dto/mailer.request';

@Controller('mailer')
export class MailerController {
  constructor(private readonly mailerService: MailerEmailService) {}
  @Post('/send-email')
  async sendEmail(@Body() body: MailderRequestDTO): Promise<void> {
    try {
      await this.mailerService.sendEmail(body);
    } catch (error) {
      throw error;
    }
  }
}
