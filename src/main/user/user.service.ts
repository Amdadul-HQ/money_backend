import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { HandleError } from 'src/common/error/handle-error.decorator';
import {
    UpdateUserProfileDto,
    UserProfileResponseDto,
} from './dto/user-profile.dto';
import { DepositService } from '../deposit/deposit.service'; // Assuming we can use or replicate logic
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class UserService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly libUtils: UtilsService,
        // Injecting DepositService might be circular if not careful, better to use Prisma directly or shared queries
    ) { }

    /**
     * 🔹 Get User Profile with comprehensive stats
     */
    @HandleError('Failed to retrieve user profile')
    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                memberStats: true,
                deposits: {
                    orderBy: { depositMonth: 'desc' },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // --- Calculate Personal Info ---
        const joinDate = user.joiningDate
            ? user.joiningDate.toISOString().split('T')[0]
            : user.createdAt.toISOString().split('T')[0];

        // Format member ID like "BDT-2024-001234" (example format)
        const memberIdFormatted = `BDT-${new Date(joinDate).getFullYear()}-${user.memberId.toString().padStart(6, '0')}`;

        const personalInfo = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            profileImage: user.documents || '/placeholder.svg?height=100&width=100', // Using documents field as profile image placeholder for now, or null
            memberId: memberIdFormatted,
            joinDate: joinDate,
            address: user.address || 'N/A',
            nidNumber: user.nid || 'N/A',
            occupation: user.occupation || 'N/A',
            emergencyContact: user.referencePhone || 'N/A',
        };

        // --- Calculate Account Info ---
        const totalDeposited = user.memberStats ? Number(user.memberStats.totalDeposited) : 0;
        const totalPenalties = user.memberStats ? Number(user.memberStats.totalPenalties) : 0;

        // Calculate current balance (simplified as total deposited for now, or fetch from a real balance table if exists)
        // System logic seems to be contribution based, so current balance = total contribution?
        const currentBalance = totalDeposited;

        const monthlyAmount = user.memberStats ? Number(user.memberStats.monthlyDepositAmount) : 1000;
        const paymentStreak = user.memberStats ? user.memberStats.consecutiveMonths : 0;

        // Calculate on-time payment rate
        const totalPaidMonths = user.memberStats ? user.memberStats.totalMonthsPaid : 0;
        const missedMonths = user.memberStats ? user.memberStats.missedMonths : 0;
        const totalMonths = totalPaidMonths + missedMonths;
        const onTimePaymentRate = totalMonths > 0 ? Math.round((totalPaidMonths / totalMonths) * 100) : 100;

        // Calculate next payment due (15th of current month or next if paid)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Check if current month is paid
        const isCurrentMonthPaid = user.deposits.some(d => {
            const dDate = new Date(d.depositMonth);
            return dDate.getFullYear() === currentYear && dDate.getMonth() === currentMonth && d.status === PaymentStatus.APPROVED;
        });

        let nextPaymentDueDate = new Date(currentYear, currentMonth, 15);
        if (isCurrentMonthPaid) {
            nextPaymentDueDate = new Date(currentYear, currentMonth + 1, 15);
        }
        // If today is past 15th and not paid, still show 15th of this month (implies overdue) or next month? 
        // Usually "Due" date remains static.

        const accountInfo = {
            accountStatus: user.status,
            accountType: 'Standard', // Defaulting as no type in DB
            totalDeposited,
            currentBalance,
            totalPenalties,
            nextPaymentDue: nextPaymentDueDate.toISOString().split('T')[0],
            monthlyAmount,
            paymentStreak,
            onTimePaymentRate,
        };

        // --- Preferences (Mocked as per plan) ---
        const preferences = {
            preferredPaymentMethod: 'bKash', // Default
            notificationsEnabled: true,
            emailAlerts: true,
            smsAlerts: false,
            language: 'English',
        };

        // --- Statistics ---
        // Calculate duration
        const joinDateObj = new Date(joinDate);
        const diffTime = Math.abs(now.getTime() - joinDateObj.getTime());
        const monthsAsMember = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));

        const totalTransactions = user.deposits.length;
        const averageMonthlyDeposit = totalTransactions > 0 ? Math.round(totalDeposited / totalTransactions) : 0;

        const statistics = {
            monthsAsMember,
            totalTransactions,
            averageMonthlyDeposit,
            lastLoginDate: user.updatedAt.toISOString().split('T')[0], // Using updatedAt as proxy for now
        };

        const response: UserProfileResponseDto = {
            personalInfo,
            accountInfo,
            preferences,
            statistics,
        };

        return successResponse(
            this.libUtils.serializeBigInt(response),
            'User profile retrieved successfully',
        );
    }

    /**
     * 🔹 Update User Profile
     */
    @HandleError('Failed to update user profile')
    async updateProfile(userId: string, dto: UpdateUserProfileDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check if email or phone is being updated and if it's already taken
        if (dto.email && dto.email !== user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existingUser) {
                throw new BadRequestException('Email already in use');
            }
        }

        if (dto.phone && dto.phone !== user.phone) {
            const existingUser = await this.prisma.user.findUnique({
                where: { phone: dto.phone },
            });
            if (existingUser) {
                throw new BadRequestException('Phone number already in use');
            }
        }

        const updatedUser = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                fatherName: dto.fatherName,
                motherName: dto.motherName,
                address: dto.address,
                occupation: dto.occupation,
                joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
            },
        });

        // Return the updated profile (reuse getProfile logic for consistency)
        return this.getProfile(updatedUser.id);
    }
}
