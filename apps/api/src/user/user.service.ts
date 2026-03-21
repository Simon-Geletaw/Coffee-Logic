import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
// import { Prisma } from '@prisma/client';

type UserReturnData = {
  id: string;

  firstName: string;
  lastName: string;
  email: string;
  role: string;
};
// type UserCreateData = {
//   firstName: string;
//   lastName: string;
//   email: string;
//   phoneNumber: string;
//   passwordHash: string;
//   role: string;
// };
type ServiceResponse = {
  status: number;
  message: string;
};
@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService & { user: PrismaClient['user'] },
  ) {}
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
      return {
        status: 400,
        message: 'Email already exists',
      };
    }
    String hashedPassword = await bcrypt.hash(userData.passwordHash, 10);
    const user = await this.prisma.user.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        phoneNumber: userData.phoneNumber,
        passwordHash: userData.passwordHash,
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
      return {
        status: 500,
        message: 'Failed to create user',
      };
    }
  }

  async deleteUser(id: string): Promise<ServiceResponse> {
    const deletedUser = await this.prisma.user.deleteMany({
      where: {
        id,
      },
    });

    if (deletedUser.count === 0) {
      return {
        status: 404,
        message: 'User not found',
      };
    }

    return {
      status: 200,
      message: 'User deleted successfully',
    };
  }
}
