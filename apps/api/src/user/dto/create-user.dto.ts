import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  firstName!: string;
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  lastName!: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phoneNumber!: string;
  @IsStrongPassword(
    {},
    {
      message:
        'Password must be at least 6 characters long and contain a mix of letters, numbers, and special characters',
    },
  )
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password!: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(['viewer', 'operator', 'manager', 'admin'], {
    message: 'Role must be either USER or ADMIN',
  })
  role!: 'operator' | 'admin' | 'manager' | 'viewer';
  defaultAddress?: string;
}
