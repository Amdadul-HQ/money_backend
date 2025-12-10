import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsEmail,
  MinLength,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { MemberStatus } from '@prisma/client';

// ============================================
// Query DTOs
// ============================================

export class QueryUserRequestDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ example: 'john' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: ['PENDING', 'ACTIVE', 'REJECTED', 'All'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'Premium' })
  @IsOptional()
  @IsString()
  accountType?: string;

  @ApiPropertyOptional({ example: 'BKASH' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

// ============================================
// Response DTOs
// ============================================

export class UserRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  nidNumber: string;

  @ApiProperty()
  address: string;

  @ApiProperty()
  occupation: string;

  @ApiProperty()
  emergencyContact: string;

  @ApiProperty()
  emergencyContactName: string;

  @ApiProperty()
  emergencyContactRelation: string;

  @ApiProperty()
  registrationFee: number;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  paymentDate: Date;

  @ApiProperty()
  requestDate: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  referredBy: string;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedDate?: Date;

  @ApiPropertyOptional()
  memberId?: number;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  rejectedDate?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;

  @ApiPropertyOptional()
  additionalNotes?: string;
}

// ============================================
// Action DTOs
// ============================================

export class ApproveUserRequestDto {
  @ApiPropertyOptional({ example: 'Additional notes for approval' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectUserRequestDto {
  @ApiProperty({ example: 'NID verification failed' })
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  rejectionReason: string;
}

// ============================================
// Create User DTO (Admin can create users manually)
// ============================================

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({ example: '01712345678' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^(\+88)?01[3-9]\d{8}$/, {
    message: 'Invalid Bangladesh phone number format',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @ApiPropertyOptional({ example: 'Mohammad Ali' })
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({ example: 'Fatema Begum' })
  @IsOptional()
  @IsString()
  motherName?: string;

  @ApiPropertyOptional({ example: 'Dhaka, Bangladesh' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional({ example: '1234567890123' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{10,17}$/, { message: 'NID must be 10-17 digits' })
  nid?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  registrationFee?: number;

  @ApiPropertyOptional({ example: 'Arfan Shojib' })
  @IsOptional()
  @IsString()
  referencePerson?: string;

  @ApiPropertyOptional({ example: '01712345678' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+88)?01[3-9]\d{8}$/, {
    message: 'Invalid reference phone number',
  })
  referencePhone?: string;

  @ApiPropertyOptional({
    example: 'ACTIVE',
    enum: MemberStatus,
    default: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00Z' })
  @IsOptional()
  @IsString()
  joiningDate?: string;
}
