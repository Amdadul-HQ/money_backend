import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { HandleError } from 'src/common/error/handle-error.decorator';
import {
  AdminOverviewDto,
  AdminStatsDto,
  RecentPaymentDto,
  MonthlyCollectionDto,
  PaymentMethodDistributionDto,
  TopContributorDto,
  BlockUserDto,
  SuspendUserDto,
  UserActionResponseDto,
  UserListQueryDto,
  PaginatedUserResponseDto,
  UserListItemDto,
  UserDetailsDto,
} from './dto/admin.dto';
import { PaymentStatus, PaymentMethod, MemberStatus, Prisma } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * 🔹 Get admin overview with all statistics
   */
  @HandleError('Failed to retrieve admin overview')
  async getOverview(): Promise<AdminOverviewDto> {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
    );

    // Get all statistics in parallel for optimization
    const [
      totalStats,
      memberStats,
      currentMonthStats,
      newMembersCount,
      recentPayments,
      monthlyCollections,
      paymentMethodStats,
      topContributors,
    ] = await Promise.all([
      this.getTotalStats(),
      this.getMemberStats(),
      this.getCurrentMonthStats(currentMonthStart, currentMonthEnd),
      this.getNewMembersCount(currentMonthStart),
      this.getRecentPayments(10),
      this.getMonthlyCollections(12),
      this.getPaymentMethodDistribution(),
      this.getTopContributors(5),
    ]);

    // Calculate current month target (active members * minimum deposit)
    const systemConfig = await this.prisma.systemConfig.findFirst({
      orderBy: { lastUpdated: 'desc' },
    });

    const minimumDeposit = systemConfig
      ? Number(systemConfig.minimumDeposit)
      : 1000;
    const currentMonthTarget = memberStats.activeMembers * minimumDeposit;

    // Calculate collection efficiency
    const collectionEfficiency =
      currentMonthTarget > 0
        ? Math.round((currentMonthStats.collected / currentMonthTarget) * 100)
        : 0;

    // Calculate average monthly deposit
    const averageMonthlyDeposit =
      memberStats.activeMembers > 0
        ? Math.round(totalStats.totalAmount / memberStats.activeMembers)
        : 0;

    const stats: AdminStatsDto = {
      totalAmount: totalStats.totalAmount,
      totalMembers: memberStats.totalMembers,
      activeMembers: memberStats.activeMembers,
      inactiveMembers: memberStats.inactiveMembers,
      currentMonthTarget,
      currentMonthCollected: currentMonthStats.collected,
      totalPenalties: totalStats.totalPenalties,
      newMembersThisMonth: newMembersCount,
      averageMonthlyDeposit,
      collectionEfficiency,
    };

    return {
      stats,
      recentPayments,
      monthlyCollections,
      paymentMethodDistribution: paymentMethodStats,
      topContributors,
    };
  }

  /**
   * 🔹 Get total statistics (all-time)
   */
  private async getTotalStats() {
    const result = await this.prisma.deposit.aggregate({
      where: {
        status: PaymentStatus.APPROVED,
      },
      _sum: {
        depositAmount: true,
        penalty: true,
        totalAmount: true,
      },
    });

    return {
      totalAmount: Number(result._sum.totalAmount || 0),
      totalPenalties: Number(result._sum.penalty || 0),
    };
  }

  /**
   * 🔹 Get member statistics
   */
  private async getMemberStats() {
    const [totalMembers, activeMembers, inactiveMembers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { status: MemberStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: {
          status: {
            in: [
              MemberStatus.INACTIVE,
              MemberStatus.SUSPENDED,
              MemberStatus.REJECTED,
            ],
          },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      inactiveMembers,
    };
  }

  /**
   * 🔹 Get current month statistics
   */
  private async getCurrentMonthStats(start: Date, end: Date) {
    const result = await this.prisma.deposit.aggregate({
      where: {
        depositMonth: {
          gte: start,
          lte: end,
        },
        status: PaymentStatus.APPROVED,
      },
      _sum: {
        totalAmount: true,
      },
    });

    return {
      collected: Number(result._sum.totalAmount || 0),
    };
  }

  /**
   * 🔹 Get new members count for current month
   */
  private async getNewMembersCount(monthStart: Date) {
    return await this.prisma.user.count({
      where: {
        createdAt: {
          gte: monthStart,
        },
      },
    });
  }

  /**
   * 🔹 Get recent payments
   */
  private async getRecentPayments(limit: number): Promise<RecentPaymentDto[]> {
    const deposits = await this.prisma.deposit.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        status: {
          in: [PaymentStatus.APPROVED, PaymentStatus.PENDING],
        },
      },
      include: {
        user: {
          select: {
            name: true,
            memberId: true,
          },
        },
      },
    });

    return deposits.map((deposit) => ({
      id: deposit.id,
      memberName: deposit.user.name,
      memberId: deposit.user.memberId,
      amount: Number(deposit.depositAmount),
      method: this.formatPaymentMethod(deposit.paymentMethod),
      date: deposit.paymentDate,
      status: deposit.status,
      penalty: Number(deposit.penalty),
    }));
  }

  /**
   * 🔹 Get monthly collections for chart (last N months)
   */
  private async getMonthlyCollections(
    months: number,
  ): Promise<MonthlyCollectionDto[]> {
    const now = new Date();
    const collections: MonthlyCollectionDto[] = [];

    // Get system config for minimum deposit
    const systemConfig = await this.prisma.systemConfig.findFirst({
      orderBy: { lastUpdated: 'desc' },
    });
    const minimumDeposit = systemConfig
      ? Number(systemConfig.minimumDeposit)
      : 1000;

    // Get current active members count (for target calculation)
    const activeMembersCount = await this.prisma.user.count({
      where: {
        status: MemberStatus.ACTIVE,
      },
    });

    // Get deposits grouped by month
    const startDate = new Date(
      now.getFullYear(),
      now.getMonth() - months + 1,
      1,
    );
    const depositsByMonth = await this.prisma.deposit.groupBy({
      by: ['depositMonth'],
      where: {
        status: PaymentStatus.APPROVED,
        depositMonth: {
          gte: startDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        memberId: true,
      },
    });

    // Create a map for quick lookup
    const depositsMap = new Map(
      depositsByMonth.map((d) => [
        this.getMonthKey(d.depositMonth),
        {
          amount: Number(d._sum.totalAmount || 0),
          members: d._count.memberId,
        },
      ]),
    );

    // Generate data for last N months
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = this.getMonthKey(monthDate);
      const depositData = depositsMap.get(monthKey) || {
        amount: 0,
        members: 0,
      };

      // Calculate target (active members * minimum deposit)
      // Note: In production, you might want to track historical member counts
      const target = activeMembersCount * minimumDeposit;

      collections.push({
        month: monthDate.toLocaleDateString('en-US', {
          month: 'short',
        }),
        amount: depositData.amount,
        target,
        members: depositData.members,
      });
    }

    return collections;
  }

  /**
   * 🔹 Get payment method distribution
   */
  private async getPaymentMethodDistribution(): Promise<
    PaymentMethodDistributionDto[]
  > {
    const result = await this.prisma.deposit.groupBy({
      by: ['paymentMethod'],
      where: {
        status: PaymentStatus.APPROVED,
      },
      _count: {
        id: true,
      },
    });

    const total = result.reduce((sum, r) => sum + r._count.id, 0);

    const colorMap: Record<PaymentMethod, string> = {
      [PaymentMethod.BKASH]: '#E91E63',
      [PaymentMethod.NAGAD]: '#FF9800',
      [PaymentMethod.ROCKET]: '#9C27B0',
      [PaymentMethod.BANK_TRANSFER]: '#2196F3',
      [PaymentMethod.HAND_TO_HAND]: '#4CAF50',
    };

    return result.map((item) => ({
      name: this.formatPaymentMethod(item.paymentMethod),
      value: total > 0 ? Math.round((item._count.id / total) * 100) : 0,
      color: colorMap[item.paymentMethod] || '#9E9E9E',
    }));
  }

  /**
   * 🔹 Get top contributors
   */
  private async getTopContributors(
    limit: number,
  ): Promise<TopContributorDto[]> {
    // Get top contributors from MemberStats
    const topStats = await this.prisma.memberStats.findMany({
      take: limit,
      orderBy: {
        totalDeposited: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    return topStats.map((stat) => ({
      name: stat.user.name,
      totalDeposited: Number(stat.totalDeposited),
      months: stat.totalMonthsPaid,
      avgMonthly:
        stat.totalMonthsPaid > 0
          ? Math.round(Number(stat.totalDeposited) / stat.totalMonthsPaid)
          : 0,
    }));
  }

  /**
   * 🔹 Format payment method for display
   */
  private formatPaymentMethod(method: PaymentMethod): string {
    const methodMap: Record<PaymentMethod, string> = {
      [PaymentMethod.BKASH]: 'bKash',
      [PaymentMethod.NAGAD]: 'Nagad',
      [PaymentMethod.ROCKET]: 'Rocket',
      [PaymentMethod.BANK_TRANSFER]: 'Bank',
      [PaymentMethod.HAND_TO_HAND]: 'Hand to Hand',
    };

    return methodMap[method] || method;
  }

  /**
   * 🔹 Get month key for grouping (YYYY-MM format)
   */
  /**
   * 🔹 Block a user
   */
  async blockUser(
    userId: string,
    dto: BlockUserDto,
  ): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: MemberStatus.BLOCKED,
      },
    });

    // Log the action (Optional but good practice)
    // await this.logAction('BLOCK_USER', userId, dto.reason);

    return {
      success: true,
      message: `User ${user.name} has been blocked successfully`,
      userId: user.id,
    };
  }

  /**
   * 🔹 Suspend a user
   */
  async suspendUser(
    userId: string,
    dto: SuspendUserDto,
  ): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: MemberStatus.SUSPENDED,
      },
    });

    return {
      success: true,
      message: `User ${user.name} has been suspended until ${dto.endDate.toLocaleDateString()}`,
      userId: user.id,
    };
  }

  /**
   * 🔹 Activate a user
   */
  async activateUser(userId: string): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: MemberStatus.ACTIVE,
      },
    });

    return {
      success: true,
      message: `User ${user.name} has been activated successfully`,
      userId: user.id,
    };
  }

  /**
   * 🔹 Remove (Delete) a user
   */
  async removeUser(userId: string): Promise<UserActionResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message: `User ${user.name} has been removed successfully`,
      userId: user.id,
    };
  }

  private getMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * 🔹 Get all users with pagination and filtering
   */
  async getAllUsers(query: UserListQueryDto): Promise<PaginatedUserResponseDto> {
    const { page = 1, limit = 10, search, status, accountType } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      // Search filter
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { nid: { contains: search, mode: 'insensitive' } },
          // Note: memberId is Int in schema but string in DTO/Frontend "BDT-2024-..."
          // We can't search formatted string directly in DB easily without raw query
          // If the user searches "123", we can search memberId field
          ...(parseInt(search) ? [{ memberId: parseInt(search) }] : []),
        ],
      }),
      // Status filter
      ...(status && { status }),
    };

    // Account Type Filter (Dynamic)
    // Premium: > 100,000 | Standard: > 10,000 | Basic: <= 10,000
    if (accountType) {
      const statsWhere: Prisma.MemberStatsWhereInput = {};
      if (accountType === 'Premium') {
        statsWhere.totalDeposited = { gt: 100000 };
      } else if (accountType === 'Standard') {
        statsWhere.totalDeposited = { gt: 10000, lte: 100000 };
      } else if (accountType === 'Basic') {
        statsWhere.totalDeposited = { lte: 10000 };
      }

      where.memberStats = statsWhere;
    }

    // Execute query
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          memberStats: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Map to DTO
    const data: UserListItemDto[] = users.map((user) => {
      const totalDeposited = Number(user.memberStats?.totalDeposited || 0);
      const totalPenalties = Number(user.memberStats?.totalPenalties || 0);

      // Determine Account Type
      let type = 'Basic';
      if (totalDeposited > 100000) type = 'Premium';
      else if (totalDeposited > 10000) type = 'Standard';

      return {
        id: user.memberId,
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        memberId: `BDT-${new Date().getFullYear()}-${String(user.memberId).padStart(6, '0')}`,
        status: user.status,
        accountType: type,
        joinDate: user.joiningDate || user.createdAt,
        lastLogin: (user as any).lastLogin || user.updatedAt, // Fallback if never logged in
        totalDeposited,
        currentBalance: totalDeposited, // Assuming strictly deposits for now
        totalPenalties,
        paymentStreak: user.memberStats?.consecutiveMonths || 0,
        address: user.address || 'N/A',
        avatar: (user as any).avatarUrl || '',
      };
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 🔹 Get single user details
   */
  async getUserDetails(userId: string): Promise<UserDetailsDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalDeposited = Number(user.memberStats?.totalDeposited || 0);
    const totalPenalties = Number(user.memberStats?.totalPenalties || 0);

    // Determine Account Type
    let type = 'Basic';
    if (totalDeposited > 100000) type = 'Premium';
    else if (totalDeposited > 10000) type = 'Standard';

    return {
      id: user.memberId,
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      memberId: `BDT-${new Date().getFullYear()}-${String(user.memberId).padStart(6, '0')}`,
      status: user.status,
      accountType: type,
      joinDate: user.joiningDate || user.createdAt,
      lastLogin: (user as any).lastLogin || user.updatedAt,
      totalDeposited,
      currentBalance: totalDeposited,
      totalPenalties,
      paymentStreak: user.memberStats?.consecutiveMonths || 0,
      address: user.address || 'N/A',
      avatar: (user as any).avatarUrl || '',
      // Extended details
      occupation: user.occupation || undefined,
      fatherName: user.fatherName || undefined,
      motherName: user.motherName || undefined,
      documents: user.documents || undefined,
      referencePerson: user.referencePerson || undefined,
      referencePhone: user.referencePhone || undefined,
      registrationFee: Number(user.registrationFee),
    };
  }
}
