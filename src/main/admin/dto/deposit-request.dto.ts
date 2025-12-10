import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaymentStatus, PaymentMethod } from '@prisma/client';

// ============================================
// Query DTOs
// ============================================

export class QueryDepositRequestDto {
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
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'all'],
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2024-09' })
  @IsOptional()
  @IsString()
  month?: string;

  @ApiPropertyOptional({
    example: 'BKASH',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

// ============================================
// Response DTOs
// ============================================

export class DepositRequestDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberId: number;

  @ApiProperty()
  memberName: string;

  @ApiProperty()
  memberEmail: string;

  @ApiProperty()
  memberPhone: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  monthOf: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  transactionId: string;

  @ApiProperty()
  referenceNumber: string;

  @ApiPropertyOptional()
  bankHolderName?: string;

  @ApiPropertyOptional()
  accountNumber?: string;

  @ApiProperty()
  submissionDate: Date;

  @ApiPropertyOptional()
  proofImage?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  penalty: number;

  @ApiProperty()
  isPenalized: boolean;

  @ApiProperty()
  daysLate: number;

  @ApiPropertyOptional()
  approvedBy?: string;

  @ApiPropertyOptional()
  approvedAt?: Date;

  @ApiPropertyOptional()
  rejectedBy?: string;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  rejectionReason?: string;
}

export class DepositRequestStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  approved: number;

  @ApiProperty()
  rejected: number;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty()
  totalPenalties: number;
}

// ============================================
// Action DTOs
// ============================================

export class ApproveDepositRequestDto {
  @ApiPropertyOptional({ example: 'Payment verified and approved' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDepositRequestDto {
  @ApiProperty({ example: 'Payment proof is unclear or invalid' })
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  @IsString()
  rejectionReason: string;
}
