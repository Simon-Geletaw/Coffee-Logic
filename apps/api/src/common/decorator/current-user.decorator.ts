import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from 'src/auth/dto/validate-user.dto';

// Shape that the JWT strategy's validate() attaches to request.user
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    // @CurrentUser('userId') returns just the id; @CurrentUser() returns the whole object
    return data ? user?.[data] : user;
  },
);
