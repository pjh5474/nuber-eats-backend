import { Test } from '@nestjs/testing';
import { EmailService } from './email.service';
import { MailerService } from '@nestjs-modules/mailer';
import * as ejs from 'ejs';

jest.mock('ejs', () => {
  return {
    renderFile: jest.fn((templatePath: string, context: object) => 'HTML'),
  };
});

const EMAIL = 'bs@email.com';
const CODE = 'VERIFY_CODE';
const TEMPLATE = 'confirmation';
const SUBJECT = 'Email Confirmation';
const CONTEXT = { email: EMAIL, code: CODE };

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
            createTransport: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should call sendEmail', async () => {
      jest
        .spyOn(MailerService.prototype, 'sendMail')
        .mockImplementation(async () => {});

      jest.spyOn(service, 'sendEmail').mockImplementation(async () => {
        try {
          const emailContent = await ejs.renderFile(
            `./email-templates/${TEMPLATE}/html.ejs`,
            CONTEXT,
          );

          await MailerService.prototype.sendMail({
            to: EMAIL,
            subject: 'Email Verification',
            html: emailContent,
          });
          return true;
        } catch (error) {
          return false;
        }
      });

      const result = await service.sendEmail(SUBJECT, TEMPLATE, CONTEXT, EMAIL);

      expect(service.sendEmail).toHaveBeenCalledTimes(1);
      expect(service.sendEmail).toHaveBeenCalledWith(
        'Email Confirmation',
        TEMPLATE,
        { email: EMAIL, code: CODE },
        EMAIL,
      );

      expect(MailerService.prototype.sendMail).toHaveBeenCalledTimes(1);
      expect(MailerService.prototype.sendMail).toHaveBeenCalledWith({
        to: EMAIL,
        subject: 'Email Verification',
        html: 'HTML',
      });

      expect(ejs.renderFile).toHaveBeenCalledTimes(1);
      expect(ejs.renderFile).toHaveBeenCalledWith(
        `./email-templates/${TEMPLATE}/html.ejs`,
        CONTEXT,
      );

      expect(result).toEqual(true);
    });
  });

  it('should send verification email', async () => {
    const res = await service.sendVerificationEmail(EMAIL, CODE);

    expect(res).toEqual(undefined);
  });

  it('should fail on exception', async () => {
    const result = await service.sendEmail(SUBJECT, TEMPLATE, CONTEXT);

    expect(result).toEqual(false);
  });
});
