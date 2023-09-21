import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfirmationEmailContext } from './email.interfaces';
import * as ejs from 'ejs';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}
  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: ConfirmationEmailContext,
  ) {
    const emailContent = await ejs.renderFile(
      './email-templates/confirmation/html.ejs',
      context,
    );

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        html: emailContent,
      });
    } catch (error) {
      console.log(error);
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail(email, 'Email Confirmation', 'confirmation', {
      email,
      code,
    });
  }
}
