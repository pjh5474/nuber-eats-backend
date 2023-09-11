import { Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UsersSerivce } from './users.service';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersSerivce) {}

  @Query((returns) => Boolean)
  hi() {
    return true;
  }
}
