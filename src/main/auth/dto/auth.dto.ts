// src/auth/dto/register-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'User Name',
    example: 'Amdadul Haque',
    required: true,
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  @Length(5, 255, { message: 'Email must be between 5 and 255 characters' })
  email: string;

  @ApiProperty({
    description: 'User Phone',
    example: '+8801756171239',
    required: true,
  })
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'User Address',
    example: '123 Main St, City, Country',
  })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: 'User password',
    example: 'Password123!',
    required: true,
    minLength: 8,
    maxLength: 32,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @Length(8, 32, { message: 'Password must be between 8 and 32 characters' })
  password: string;

  // Optional social media fields
  @IsOptional()
  @IsString({ message: 'Link with https' })
  facebook?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  youtube?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  twitter?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  instagram?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  pinterest?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  linkedin?: string;

  @IsOptional()
  @IsString({ message: 'Link with https' })
  tiktok?: string;
}
