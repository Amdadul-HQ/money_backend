import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MemberStatus } from '@prisma/client';

// ============================================
// Request DTOs
// ============================================

export class UserListQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountType?: string;
}

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
  @ApiPropertyOptional()
  userId?: string;
}

export class UserListItemDto {
  @ApiProperty()
  id: number; // memberId sequence

  @ApiProperty()
  userId: string; // uuid

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  memberId: string; // formatted BDT-xxxx

  @ApiProperty()
  status: string;

  @ApiProperty()
  accountType: string;

  @ApiProperty()
  joinDate: Date;

  @ApiProperty()
  lastLogin: Date;

  @ApiProperty()
  totalDeposited: number;

  @ApiProperty()
  currentBalance: number;

  @ApiProperty()
  totalPenalties: number;

  @ApiProperty()
  paymentStreak: number;

  @ApiProperty()
  address: string;

  @ApiProperty()
  avatar: string;
}

export class PaginatedUserResponseDto {
  @ApiProperty({ type: [UserListItemDto] })
  data: UserListItemDto[];

  @ApiProperty()
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class UserDetailsDto extends UserListItemDto {
  // Add extended details if needed for detail view
  @ApiPropertyOptional()
  occupation?: string;

  @ApiPropertyOptional()
  fatherName?: string;

  @ApiPropertyOptional()
  motherName?: string;

  @ApiPropertyOptional()
  documents?: string;

  @ApiPropertyOptional()
  referencePerson?: string;

  @ApiPropertyOptional()
  referencePhone?: string;

  @ApiPropertyOptional()
  registrationFee?: number;
}
