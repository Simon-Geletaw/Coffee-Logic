import { Body, Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { ValidateUserDto } from './dto/validate-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(@Body() validateUserD: ValidateUserDto) {
        return this.authService.validateUser(validateUserD);  
    }
}
