import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AllowdRoles } from './role.decorator';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    // roles from the decorator of the resolver ( @Role(['Any'] ) => roles = ['Any'] )
    const roles = this.reflector.get<AllowdRoles>(
      'roles',
      context.getHandler(),
    );

    // @Role(['Any'])
    if (!roles) {
      return true;
    }
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const user: User = gqlContext['user'];

    // it means that user is not logged in
    if (!user) {
      return false;
    }

    // any user can access
    if (roles.includes('Any')) {
      return true;
    }

    // only user with the role can access
    return roles.includes(user.role);
  }
}
