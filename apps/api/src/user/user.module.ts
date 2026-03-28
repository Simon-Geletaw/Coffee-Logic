import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.modue';

@Module({
  controllers: [UserController],
  providers: [UserService, PrismaModule],
})
export class UserModule {}
