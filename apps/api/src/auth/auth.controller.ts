import { Body, Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { ValidateUserDto } from './dto/validate-user.dto';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
@Throttle({ default: { ttl: 60, limit: 5 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() validateUserD: ValidateUserDto) {
    return this.authService.validateUser(validateUserD);
  }
}
