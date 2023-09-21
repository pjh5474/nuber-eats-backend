import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfirmationEmailContext } from './email.interfaces';
import * as ejs from 'ejs';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}
  async sendEmail(
    subject: string,
    template: string,
    context: ConfirmationEmailContext,
    to?: string,
  ) {
    try {
      if (!to) throw new Error('No email to send');

      const emailContent = await ejs.renderFile(
        `./email-templates/${template}/html.ejs`,
        context,
      );
      await this.mailerService.sendMail({
        to,
        subject,
        html: emailContent,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail(
      'Email Confirmation',
      'confirmation',
      {
        email,
        code,
      },
      email,
    );
  }
}
