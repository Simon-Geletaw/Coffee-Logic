import {
  Get,
  Post,
  Body,
  Controller,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { CurrentUser } from 'src/common/decorator/current-user.decorator';
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser('userId') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles('admin') // list all users only for admin
  getAllUsers() {
    return this.userService.getAllUsers();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  createUser(@Body() createUserD: CreateUserDto) {
    return this.userService.createUser(createUserD);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
