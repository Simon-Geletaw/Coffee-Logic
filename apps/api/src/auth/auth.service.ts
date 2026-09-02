import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import {
  AuthTokenPayloadDto,
  UserRole,
  ValidateUserDto,
} from './dto/validate-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(
    acceptedUserDto: ValidateUserDto,
  ): Promise<{ code: number; message: string; token?: string }> {
    const foundUser = await this.prismaService.user.findUnique({
      where: {
        email: acceptedUserDto.email,
      },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!foundUser) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (foundUser.isActive == false) {
      throw new UnauthorizedException('User account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      acceptedUserDto.password,
      foundUser.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload: AuthTokenPayloadDto = {
      userId: foundUser.id,
      email: foundUser.email,
      role: foundUser.role as UserRole,
    };

    const token = await this.jwtService.signAsync(payload);
    return {
      code: 200,
      message: 'Login successful',
      token,
    };
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
