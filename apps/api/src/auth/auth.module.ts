import { Module, Options } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { env } from 'process';
// import { PrismaService } from '../prisma/prisma.service';
import { sign } from 'crypto';

@Module({
  imports: [JwtModule.register({
    secret: process.env.Secret_JWT,
    signOptions: { expiresIn: '1h' }
  })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}