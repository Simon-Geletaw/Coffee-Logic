import { Body, Controller } from '@nestjs/common';
import { Post,Get } from '@nestjs/common';
import {  validateUserDto } from './dto/validate-user.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    login(@Body() validateUserD: validateUserDto) {
        return this.authService.validateUser(validateUserD);  
    }
}
