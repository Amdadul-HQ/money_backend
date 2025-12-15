import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

// ============================================
// Request DTOs
// ============================================

export class BlockUserDto {
  @ApiProperty({ example: 'Violation of community guidelines' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class SuspendUserDto {
  @ApiProperty({ example: 'Missed payments for 3 consecutive months' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: '2023-12-31T23:59:59.999Z' })
  @IsDate()
  @Type(() => Date)
  endDate: Date;
}

// ============================================
// Response DTOs
// ============================================

export class AdminStatsDto {
  @ApiProperty({ example: 2450000 })
  totalAmount: number;

  @ApiProperty({ example: 156 })
  totalMembers: number;

  @ApiProperty({ example: 142 })
  activeMembers: number;

  @ApiProperty({ example: 14 })
  inactiveMembers: number;

  @ApiProperty({ example: 2500000 })
  currentMonthTarget: number;

  @ApiProperty({ example: 1850000 })
  currentMonthCollected: number;

  @ApiProperty({ example: 45000 })
  totalPenalties: number;

  @ApiProperty({ example: 8 })
  newMembersThisMonth: number;

  @ApiProperty({ example: 15000 })
  averageMonthlyDeposit: number;

  @ApiProperty({ example: 74 })
  collectionEfficiency: number;
}

export class RecentPaymentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberName: string;

  @ApiProperty()
  memberId: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  method: string;

  @ApiProperty()
  date: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  penalty: number;
}

export class MonthlyCollectionDto {
  @ApiProperty()
  month: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  target: number;

  @ApiProperty()
  members: number;
}

export class PaymentMethodDistributionDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  value: number;

  @ApiProperty()
  color: string;
}

export class TopContributorDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  totalDeposited: number;

  @ApiProperty()
  months: number;

  @ApiProperty()
  avgMonthly: number;
}

export class AdminOverviewDto {
  @ApiProperty({ type: AdminStatsDto })
  stats: AdminStatsDto;

  @ApiProperty({ type: [RecentPaymentDto] })
  recentPayments: RecentPaymentDto[];

  @ApiProperty({ type: [MonthlyCollectionDto] })
  monthlyCollections: MonthlyCollectionDto[];

  @ApiProperty({ type: [PaymentMethodDistributionDto] })
  paymentMethodDistribution: PaymentMethodDistributionDto[];

  @ApiProperty({ type: [TopContributorDto] })
  topContributors: TopContributorDto[];
}

export class UserActionResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  userId?: string;
}
