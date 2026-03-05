import {Get,Delete, Patch, Post, Body, Controller, Param} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {} 
  @Get()
  getAllUsers() {
    return this.userService.getAllUsers();
  }
  Post()
  createUser(@Body() createUserDto: CreateUserDto) {
        return this.userService.createUser(createUserDto);
  }
}