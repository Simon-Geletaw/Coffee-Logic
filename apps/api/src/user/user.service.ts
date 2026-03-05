import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
type UserReturnData={
    firstName:string;
    lastName:string;
    email:string;
}
type UserCreateData={
    firstName:string;
    lastName:string;
    email:string;
    phoneNumber:string;
    passwordHash:string;
    role:string;

}
type ServiceResponse={
    status:number;
    message:string;
}
@Injectable()
export class UserService {
    constructor(private readonly prisma:PrismaService){}
    async getAllUsers():Promise<UserReturnData[]>{
        const user:UserReturnData[]=await this.prisma.user.findMany({
            select:{
                email:true,
                firstName:true,
                lastName:true,
                }
            });
        return user;};
        async createUser(userData:CreateUserDto):Promise<ServiceResponse>{
            const existingUserEmail=await this.prisma.user.findUnique({
                where:{
                    email:userData.email,}
            });
            const exsistingUserPhone=await this.prisma.user.findUnique({
                where:{
                    phoneNumber:userData.phoneNumber,}
            });
            if(existingUserEmail || exsistingUserPhone){
                return {
                    status:400,
                    message:'Email already exists'
                }
            }
            const user= await this.prisma.user.create({
                data:{
                    firstName:userData.firstName,
                    lastName:userData.lastName,
                    email:userData.email,
                    phoneNumber:userData.phoneNumber,
                    passwordHash:userData.passwordHash,
                    role:userData.role,
                    defaultAddress:userData.defaultAddress,
                }});
                if(user){
                    return {
                        status:201,
                        message:'User created successfully'
                    }
                }
                else{                   
                     return {
                        status:500,
                        message:'Failed to create user'
                    }
                }
       
        }}