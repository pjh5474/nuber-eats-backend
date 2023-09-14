import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/veritication.entity';
import { UsersResolver } from './users.resolver';
import { UserSerivce } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Verification])],
  providers: [UsersResolver, UserSerivce],
  exports: [UserSerivce],
})
export class UsersModule {}
