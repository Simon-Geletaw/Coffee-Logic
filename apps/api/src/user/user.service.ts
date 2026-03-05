import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Response } from 'express';
type UserReturnData={
    first_name:string;
    last_name:string;
    email:string;
}
type UserCreateData={
    first_name:string;
    last_name:string;
    email:string;
    phoneNumber:string;
    passwordHash:string;
    role:string;

}
@Injectable()
export class UserService {
    constructor(private readonly prisma:PrismaService){}
    async getAllUsers():Promise<UserReturnData[]>{
        const user:UserReturnData[]=await this.prisma.user.findMany({
            select:{
                email:true,
                first_name:true,
                last_name:true,
                }
            });
        return user;};
        async createUser(userData:UserCreateData):Promise<Response>{
            if(!userData.email || !userData.passwordHash || !userData.first_name || !userData.last_name || !userData.phoneNumber){
                return {
                    status:400,
                    message:'Missing required fields'
                } as unknown as Response;
            }
            const {email}=userData;
            const existingUserEmail=await this.prisma.user.findUnique({
                where:{email}
            });
            const exsitPhoneNumber=await this.prisma.user.findUnique({
                where:{phoneNumber:userData.phoneNumber}
            });
                if(existingUserEmail || exsitPhoneNumber){
                return {
                    status:400,
                    message:'User with this email already exists'
                } as unknown as Response;
            }
            const user=await this.prisma.user.create({
                data:userData,
                select:{
                    email:true,}});
        }
    }   
