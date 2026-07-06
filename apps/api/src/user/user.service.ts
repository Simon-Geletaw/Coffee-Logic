import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
// import { Prisma } from '@prisma/client';

type UserReturnData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};
type ServiceResponse = {
  status: number;
  message: string;
};
@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}
  async getAllUsers(): Promise<UserReturnData[]> {
    const user = (await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    })) as UserReturnData[];
    return user;
  }
  async getProfile(id: string): Promise<UserReturnData> {
    const user = (await this.prisma.user.findUnique({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      where: {
        id: id,
      },
    })) as UserReturnData;
    return user;
  }

  async createUser(userData: CreateUserDto): Promise<ServiceResponse> {
    const existingUserEmail = await this.prisma.user.findUnique({
      where: {
        email: userData.email,
      },
    });
    const exsistingUserPhone = await this.prisma.user.findUnique({
      where: {
        phoneNumber: userData.phoneNumber,
      },
    });
    if (existingUserEmail || exsistingUserPhone) {
      throw new ConflictException('Email or phone number already exists');
    }
    try {
      const hashedPassword: string = await this.hashPassword(userData.password);

      const user = await this.prisma.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          passwordHash: hashedPassword,
          role: userData.role,
          defaultAddress: userData.defaultAddress,
        },
      });
      if (user) {
        return {
          status: 201,
          message: 'User created successfully',
        };
      } else {
        throw new InternalServerErrorException('Failed to create user');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  async deleteUser(id: string): Promise<ServiceResponse> {
    const deletedUser = await this.prisma.user.deleteMany({
      where: {
        id,
      },
    });

    if (deletedUser.count === 0) {
      throw new NotFoundException('User not found or already deleted');
    }

    return {
      status: 200,
      message: 'User deleted successfully',
    };
  }
  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    if (!password) {
      throw new Error('Password is required');
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error('Password must contain at least one special character');
    }
    return await bcrypt.hash(password, saltRounds);
  }
}
