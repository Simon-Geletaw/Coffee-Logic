import { Get, Post, Body, Controller, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {} 

  @Get()
  @UseGuards(JwtAuthGuard)
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Post()
  createUser(@Body() createUserD: CreateUserDto) {
        return this.userService.createUser(createUserD);
  }
}