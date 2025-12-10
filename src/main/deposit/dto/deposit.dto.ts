import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  Min,
  ValidateIf,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

// ============================================
// Payment Method Specific DTOs
// ============================================

export class HandToHandPaymentDto {
  @ApiProperty({ example: 'Arfan Shojib' })
  @IsNotEmpty({ message: 'Receiver name is required' })
  @IsString()
  receiverName: string;

  @ApiProperty({ example: 'Dhaka Office' })
  @IsNotEmpty({ message: 'Location is required' })
  @IsString()
  location: string;

  @ApiProperty({ example: '2024-01-15T00:00:00Z' })
  @IsNotEmpty({ message: 'Handover date is required' })
  @IsDateString()
  handoverDate: string;

  @ApiProperty({ example: '14:30' })
  @IsNotEmpty({ message: 'Handover time is required' })
  @IsString()
  handoverTime: string;
}

export class MobilePaymentDto {
  @ApiProperty({ example: 'BKASH', enum: ['BKASH', 'NAGAD', 'ROCKET'] })
  @IsNotEmpty({ message: 'Provider is required' })
  @IsString()
  provider: string;

  @ApiProperty({ example: '01712345678' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: 'TRX123456789' })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  @IsString()
  transactionId: string;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}

export class BankTransferDto {
  @ApiPropertyOptional({ example: 'Sonali Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty({ message: 'Account number is required' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'Arfan Shojib' })
  @IsNotEmpty({ message: 'Account holder name is required' })
  @IsString()
  accountHolderName: string;

  @ApiPropertyOptional({ example: 'TXN123456789' })
  @IsOptional()
  @IsString()
  transactionRef?: string;
}

// ============================================
// Main Deposit DTOs
// ============================================

export class CreateDepositDto {
  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  @IsNotEmpty({ message: 'Deposit month is required' })
  @IsDateString()
  depositMonth: string;

  @ApiProperty({ example: 1000, minimum: 1000 })
  @IsNotEmpty({ message: 'Deposit amount is required' })
  @IsNumber()
  @Type(() => Number)
  @Min(1000, { message: 'Deposit amount must be at least 1000 BDT' })
  depositAmount: number;

  @ApiProperty({
    example: 'HAND_TO_HAND',
    enum: PaymentMethod,
  })
  @IsNotEmpty({ message: 'Payment method is required' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: 'Arfan Shojib' })
  @IsNotEmpty({ message: 'Reference person is required' })
  @IsString()
  referencePerson: string;

  @ApiPropertyOptional({ example: 'https://example.com/proof.jpg' })
  @IsOptional()
  @IsString()
  proofImage?: string;

  @ApiPropertyOptional({ example: 'Monthly contribution for January' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Payment method specific details
  @ApiPropertyOptional({ type: HandToHandPaymentDto })
  @ValidateIf((o) => o.paymentMethod === PaymentMethod.HAND_TO_HAND)
  @IsNotEmpty({ message: 'Hand to hand payment details are required' })
  @Type(() => HandToHandPaymentDto)
  handToHandDetails?: HandToHandPaymentDto;

  @ApiPropertyOptional({ type: MobilePaymentDto })
  @ValidateIf(
    (o) =>
      o.paymentMethod === PaymentMethod.BKASH ||
      o.paymentMethod === PaymentMethod.NAGAD ||
      o.paymentMethod === PaymentMethod.ROCKET,
  )
  @IsNotEmpty({ message: 'Mobile payment details are required' })
  @Type(() => MobilePaymentDto)
  mobilePaymentDetails?: MobilePaymentDto;

  @ApiPropertyOptional({ type: BankTransferDto })
  @ValidateIf((o) => o.paymentMethod === PaymentMethod.BANK_TRANSFER)
  @IsNotEmpty({ message: 'Bank transfer details are required' })
  @Type(() => BankTransferDto)
  bankTransferDetails?: BankTransferDto;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}

export class UpdateDepositDto {
  @ApiPropertyOptional({ example: 1000, minimum: 1000 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1000, { message: 'Deposit amount must be at least 1000 BDT' })
  depositAmount?: number;

  @ApiPropertyOptional({
    example: 'HAND_TO_HAND',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'Arfan Shojib' })
  @IsOptional()
  @IsString()
  referencePerson?: string;

  @ApiPropertyOptional({ example: 'https://example.com/proof.jpg' })
  @IsOptional()
  @IsString()
  proofImage?: string;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  // Payment method specific details
  @ApiPropertyOptional({ type: HandToHandPaymentDto })
  @IsOptional()
  @Type(() => HandToHandPaymentDto)
  handToHandDetails?: HandToHandPaymentDto;

  @ApiPropertyOptional({ type: MobilePaymentDto })
  @IsOptional()
  @Type(() => MobilePaymentDto)
  mobilePaymentDetails?: MobilePaymentDto;

  @ApiPropertyOptional({ type: BankTransferDto })
  @IsOptional()
  @Type(() => BankTransferDto)
  bankTransferDetails?: BankTransferDto;

  @ApiPropertyOptional({ example: '2024-01-15T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;
}

export class QueryDepositDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    example: 'PENDING',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'HAND_TO_HAND',
    enum: PaymentMethod,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

