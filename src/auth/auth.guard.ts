import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { AllowdRoles } from './role.decorator';
import { User } from 'src/users/entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { UserService } from 'src/users/users.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext) {
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
    const token = gqlContext.token;

    if (!token) {
      return false;
    }

    const decoded = this.jwtService.verify(token.toString());
    if (typeof decoded === 'object' && decoded.hasOwnProperty('id')) {
      const { user } = await this.userService.findById(decoded['id']);

      // it means that user is not logged in
      if (!user) {
        return false;
      }

      gqlContext['user'] = user;

      // any user can access
      if (roles.includes('Any')) {
        return true;
      }

      // only user with the role can access
      return roles.includes(user.role);
    } else {
      return false;
    }
  }
}
