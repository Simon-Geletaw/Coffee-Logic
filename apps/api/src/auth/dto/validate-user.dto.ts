import { IsEmail, Min, validate } from "class-validator";
import { PassThrough } from "stream";

export validateUserDto {
    @IsEmail({},{ message: 'Invalid email address' })
    email: string;
    Min(6, { message: 'Password must be at least 6 characters long' })
    password: string;
};