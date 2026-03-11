import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
type validatedUserDto={
    userId:number;
    email:string;
}

@Injectable()
export class AuthService {
    constructor(private readonly prismaService:PrismaService,private readonly jwtService:JwtService){}
    async validateUser(acceptedUserDto: CreateUserDto): Promise<{ code: number; message: string; token?: string }> {
        const findEmail = await this.prismaService.user.findUnique({
            where: {
                email: acceptedUserDto.email,
            },
            select:{
                passwordHash:true,
                userId:true
            }
        });
    
        if(!findEmail){
            return { code: 400, message: 'Invalid email or password'  };
        } else {
            const isPasswordValid = await this.comparePassword(acceptedUserDto.passwordHash, findEmail.passwordHash);
            if (!isPasswordValid) {
                return { code: 400, message: 'Invalid email or password' };
            }
            else {
                const payload: validatedUserDto = {
                    userId: findEmail.userId,
                    email: acceptedUserDto.email
                };
                const token = this.jwtService.sign(payload);
                return { code: 200, message: 'Login successful', token };
            }
            }
                
        };



    async hashPassword(password:string):Promise<string>{
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }
    async comparePassword(password:string, hash:string):Promise<boolean>{
        return await bcrypt.compare(password, hash);
    }
    

}
