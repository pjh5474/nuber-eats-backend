import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { MailerService } from '@nestjs-modules/mailer';

const GRAPHQL_ENDPOINT = '/graphql';

describe('UserModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      providers: [
        {
          provide: MailerService,
          useValue: {
            sendMail: jest.fn(),
            createTransport: jest.fn(),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    const dataSource: DataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    const connection: DataSource = await dataSource.initialize();
    await connection.dropDatabase(); // 데이터베이스 삭제
    await connection.destroy(); // 연결 해제
    await app.close();
  });

  describe('createAccount', () => {
    const EMAIL = 'nico@niconico.com';
    it('should create account', () => {
      jest
        .spyOn(MailerService.prototype, 'sendMail')
        .mockImplementation(async () => {
          console.log('sendMail');
        });
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
          mutation {
            createAccount(input: {
              email:"${EMAIL}",
              password: "1234",
              role: Owner
            }) {
              ok
              error
            }
          }
        `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(true);
          expect(res.body.data.createAccount.error).toBe(null);
        });
    });

    it('should fail if account already exists', () => {
      return request(app.getHttpServer())
        .post(GRAPHQL_ENDPOINT)
        .send({
          query: `
        mutation {
          createAccount(input: {
            email:"${EMAIL}",
            password: "1234",
            role: Owner
          }) {
            ok
            error
          }
        }
      `,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.createAccount.ok).toBe(false);
          expect(res.body.data.createAccount.error).toBe(
            'There is a user with that email already',
          );
        });
    });
  });

  it.todo('me');
  it.todo('userProfile');
  it.todo('login');
  it.todo('editProfile');
  it.todo('verifyEmail');
});
