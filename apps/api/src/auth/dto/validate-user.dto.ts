import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export enum UserRole {
  VIEWER = 'viewer',
  OPERATOR = 'operator',
  MANAGER = 'manager',
  ADMIN = 'admin',
}

export class ValidateUserDto {
  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password!: string;
}

export class AuthTokenPayloadDto {
  userId!: string;

  @IsEmail({}, { message: 'Invalid email address' })
  email!: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  role!: UserRole;
}
