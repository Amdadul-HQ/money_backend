import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserProfileDto {
    @ApiProperty({ description: 'Full Name', required: false })
    @IsString()
    @IsOptional()
    name?: string;

    @ApiProperty({ description: 'Email address', required: false })
    @IsEmail()
    @IsOptional()
    email?: string;

    @ApiProperty({ description: 'Phone number', required: false })
    @IsString()
    @IsOptional()
    phone?: string;

    @ApiProperty({ description: 'Father Name', required: false })
    @IsString()
    @IsOptional()
    fatherName?: string;

    @ApiProperty({ description: 'Mother Name', required: false })
    @IsString()
    @IsOptional()
    motherName?: string;

    @ApiProperty({ description: 'Address', required: false })
    @IsString()
    @IsOptional()
    address?: string;

    @ApiProperty({ description: 'Occupation', required: false })
    @IsString()
    @IsOptional()
    occupation?: string;

    @ApiProperty({ description: 'Joining Date', required: false })
    @IsDateString()
    @IsOptional()
    joiningDate?: string;
}

export class PersonalInfoDto {
    name: string;
    email: string;
    phone: string;
    profileImage: string;
    memberId: string;
    joinDate: string;
    address: string;
    nidNumber: string;
    occupation: string;
    emergencyContact: string; // From referencePerson in DB?
}

export class AccountInfoDto {
    accountStatus: string;
    accountType: string;
    totalDeposited: number;
    currentBalance: number;
    totalPenalties: number;
    nextPaymentDue: string;
    monthlyAmount: number;
    paymentStreak: number;
    onTimePaymentRate: number;
}

export class PreferencesDto {
    preferredPaymentMethod: string;
    notificationsEnabled: boolean;
    emailAlerts: boolean;
    smsAlerts: boolean;
    language: string;
}

export class StatisticsDto {
    monthsAsMember: number;
    totalTransactions: number;
    averageMonthlyDeposit: number;
    lastLoginDate: string;
}

export class UserProfileResponseDto {
    personalInfo: PersonalInfoDto;
    accountInfo: AccountInfoDto;
    preferences: PreferencesDto;
    statistics: StatisticsDto;
}
