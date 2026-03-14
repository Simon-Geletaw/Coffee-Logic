import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtAuthStrategy } from './strategy/jwt.strategy';
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? process.env.Secret_JWT,
      signOptions: { expiresIn: '1h' },
    }),
    
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, JwtAuthStrategy],
})
export class AuthModule {}