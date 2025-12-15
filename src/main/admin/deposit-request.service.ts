import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { EmailService } from 'src/common/email/email.service';
import { successResponse } from 'src/common/utils/response.util';
import { HandleError } from 'src/common/error/handle-error.decorator';
import { ENVEnum } from 'src/common/enum/env.enum';
import {
  QueryDepositRequestDto,
  DepositRequestDto,
  DepositRequestStatsDto,
  ApproveDepositRequestDto,
  RejectDepositRequestDto,
} from './dto/deposit-request.dto';
import { PaymentStatus, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepositRequestService {
  private readonly logger = new Logger(DepositRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * 🔹 Get all deposit requests with filters and pagination
   */
  @HandleError('Failed to retrieve deposit requests')
  async getAllDepositRequests(dto: QueryDepositRequestDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.DepositWhereInput = {};

    // Status filter
    if (dto.status && dto.status !== 'all') {
      where.status = dto.status as PaymentStatus;
    }

    // Month filter
    if (dto.month) {
      const [year, month] = dto.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      where.depositMonth = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Payment method filter
    if (dto.paymentMethod) {
      where.paymentMethod = dto.paymentMethod;
    }

    // Search filter
    if (dto.search) {
      const searchTerm = dto.search;
      const searchConditions: Prisma.DepositWhereInput[] = [
        {
          user: {
            name: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          user: {
            phone: { contains: searchTerm },
          },
        },
        {
          notes: { contains: searchTerm, mode: 'insensitive' },
        },
        {
          mobilePaymentDetails: {
            transactionId: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          bankTransferDetails: {
            transactionRef: { contains: searchTerm, mode: 'insensitive' },
          },
        },
        {
          bankTransferDetails: {
            accountNumber: { contains: searchTerm, mode: 'insensitive' },
          },
        },
      ];

      // Add memberId search if search term is numeric
      if (!isNaN(Number(searchTerm)) && searchTerm.trim() !== '') {
        searchConditions.push({
          user: {
            memberId: { equals: Number(searchTerm) },
          },
        });
      }

      where.OR = searchConditions;
    }

    // Get deposits with pagination
    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              memberId: true,
            },
          },
          handToHandDetails: true,
          mobilePaymentDetails: true,
          bankTransferDetails: true,
        },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    // Get approval/rejection info from AuditLog
    const depositIds = deposits.map((d) => d.id);
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'Deposit',
        entityId: { in: depositIds },
        action: { in: ['DEPOSIT_APPROVED', 'DEPOSIT_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map for quick lookup
    const auditMap = new Map<string, (typeof auditLogs)[0]>();
    auditLogs.forEach((log) => {
      if (!auditMap.has(log.entityId)) {
        auditMap.set(log.entityId, log);
      }
    });

    // Transform to DepositRequestDto format
    const requests: DepositRequestDto[] = deposits.map((deposit) => {
      const auditLog = auditMap.get(deposit.id);
      let approvedBy: string | undefined;
      let approvedAt: Date | undefined;
      let rejectedBy: string | undefined;
      let rejectedAt: Date | undefined;

      if (auditLog) {
        if (auditLog.action === 'DEPOSIT_APPROVED') {
          approvedBy = auditLog.performedByName || 'Admin';
          approvedAt = auditLog.createdAt;
        } else if (auditLog.action === 'DEPOSIT_REJECTED') {
          rejectedBy = auditLog.performedByName || 'Admin';
          rejectedAt = auditLog.createdAt;
        }
      }

      // Calculate days late (if payment date is after 15th of deposit month)
      const depositMonth = new Date(deposit.depositMonth);
      const penaltyStartDate = new Date(depositMonth);
      penaltyStartDate.setDate(16);
      penaltyStartDate.setHours(0, 0, 0, 0);

      const daysLate =
        deposit.paymentDate > penaltyStartDate
          ? Math.floor(
            (deposit.paymentDate.getTime() - penaltyStartDate.getTime()) /
            (1000 * 60 * 60 * 24),
          )
          : 0;

      // Get payment method details
      const paymentMethod = this.formatPaymentMethod(deposit.paymentMethod);
      let transactionId = 'N/A';
      let referenceNumber = 'N/A';
      let bankHolderName: string | undefined;
      let accountNumber: string | undefined;

      if (deposit.mobilePaymentDetails) {
        transactionId = deposit.mobilePaymentDetails.transactionId;
        referenceNumber = deposit.mobilePaymentDetails.transactionId;
      } else if (deposit.bankTransferDetails) {
        transactionId = deposit.bankTransferDetails.transactionRef || 'N/A';
        referenceNumber = deposit.bankTransferDetails.transactionRef || 'N/A';
        bankHolderName = deposit.bankTransferDetails.accountHolderName;
        accountNumber = deposit.bankTransferDetails.accountNumber;
      } else if (deposit.handToHandDetails) {
        referenceNumber = `HTH-${deposit.id.slice(0, 8).toUpperCase()}`;
        transactionId = referenceNumber;
      }

      return {
        id: deposit.id,
        memberId: deposit.user.memberId,
        memberName: deposit.user.name,
        memberEmail: deposit.user.email,
        memberPhone: deposit.user.phone,
        accountType: 'Standard', // Can be enhanced based on user data
        monthOf: depositMonth.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        }),
        amount: Number(deposit.depositAmount),
        paymentMethod,
        transactionId,
        referenceNumber,
        bankHolderName,
        accountNumber,
        submissionDate: deposit.createdAt,
        proofImage: deposit.proofImage || undefined,
        status: this.mapStatusToFrontend(deposit.status),
        notes: deposit.notes || undefined,
        penalty: Number(deposit.penalty),
        isPenalized: Number(deposit.penalty) > 0,
        daysLate,
        approvedBy,
        approvedAt,
        rejectedBy,
        rejectedAt,
        rejectionReason: deposit.rejectionReason || undefined,
      };
    });

    // Calculate statistics
    const stats = await this.calculateStats(where);

    return successResponse(
      {
        requests,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'Deposit requests retrieved successfully',
    );
  }

  /**
   * 🔹 Get single deposit request by ID
   */
  @HandleError('Failed to retrieve deposit request')
  async getDepositRequestById(depositId: string) {
    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            memberId: true,
          },
        },
        handToHandDetails: true,
        mobilePaymentDetails: true,
        bankTransferDetails: true,
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit request not found');
    }

    // Get approval/rejection info
    const auditLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Deposit',
        entityId: deposit.id,
        action: { in: ['DEPOSIT_APPROVED', 'DEPOSIT_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let approvedBy: string | undefined;
    let approvedAt: Date | undefined;
    let rejectedBy: string | undefined;
    let rejectedAt: Date | undefined;

    if (auditLog) {
      if (auditLog.action === 'DEPOSIT_APPROVED') {
        approvedBy = auditLog.performedByName || 'Admin';
        approvedAt = auditLog.createdAt;
      } else if (auditLog.action === 'DEPOSIT_REJECTED') {
        rejectedBy = auditLog.performedByName || 'Admin';
        rejectedAt = auditLog.createdAt;
      }
    }

    // Calculate days late
    const depositMonth = new Date(deposit.depositMonth);
    const penaltyStartDate = new Date(depositMonth);
    penaltyStartDate.setDate(16);
    penaltyStartDate.setHours(0, 0, 0, 0);

    const daysLate =
      deposit.paymentDate > penaltyStartDate
        ? Math.floor(
          (deposit.paymentDate.getTime() - penaltyStartDate.getTime()) /
          (1000 * 60 * 60 * 24),
        )
        : 0;

    // Get payment method details
    const paymentMethod = this.formatPaymentMethod(deposit.paymentMethod);
    let transactionId = 'N/A';
    let referenceNumber = 'N/A';
    let bankHolderName: string | undefined;
    let accountNumber: string | undefined;

    if (deposit.mobilePaymentDetails) {
      transactionId = deposit.mobilePaymentDetails.transactionId;
      referenceNumber = deposit.mobilePaymentDetails.transactionId;
    } else if (deposit.bankTransferDetails) {
      transactionId = deposit.bankTransferDetails.transactionRef || 'N/A';
      referenceNumber = deposit.bankTransferDetails.transactionRef || 'N/A';
      bankHolderName = deposit.bankTransferDetails.accountHolderName;
      accountNumber = deposit.bankTransferDetails.accountNumber;
    } else if (deposit.handToHandDetails) {
      referenceNumber = `HTH-${deposit.id.slice(0, 8).toUpperCase()}`;
      transactionId = referenceNumber;
    }

    const request: DepositRequestDto = {
      id: deposit.id,
      memberId: deposit.user.memberId,
      memberName: deposit.user.name,
      memberEmail: deposit.user.email,
      memberPhone: deposit.user.phone,
      accountType: 'Standard',
      monthOf: depositMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      amount: Number(deposit.depositAmount),
      paymentMethod,
      transactionId,
      referenceNumber,
      bankHolderName,
      accountNumber,
      submissionDate: deposit.createdAt,
      proofImage: deposit.proofImage || undefined,
      status: this.mapStatusToFrontend(deposit.status),
      notes: deposit.notes || undefined,
      penalty: Number(deposit.penalty),
      isPenalized: Number(deposit.penalty) > 0,
      daysLate,
      approvedBy,
      approvedAt,
      rejectedBy,
      rejectedAt,
      rejectionReason: deposit.rejectionReason || undefined,
    };

    return successResponse(request, 'Deposit request retrieved successfully');
  }

  /**
   * 🔹 Approve deposit request
   */
  @HandleError('Failed to approve deposit request')
  async approveDepositRequest(
    depositId: string,
    dto: ApproveDepositRequestDto,
    adminMemberId: number,
  ) {
    // Get admin info
    const admin = await this.prisma.user.findUnique({
      where: { memberId: adminMemberId },
      select: { name: true },
    });

    const adminName = admin?.name || 'Admin';

    const depositRecord = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            memberId: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!depositRecord) {
      throw new NotFoundException('Deposit request not found');
    }

    if (depositRecord.status === PaymentStatus.APPROVED) {
      throw new BadRequestException('Deposit is already approved');
    }

    if (depositRecord.status === PaymentStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot approve a rejected deposit. Please create a new deposit request.',
      );
    }

    // Update deposit status and update MemberStats
    const updatedDeposit = await this.prisma.$transaction(async (tx) => {
      // Update deposit
      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: PaymentStatus.APPROVED,
          approvedBy: adminMemberId,
          approvedAt: new Date(),
          notes: dto.notes || depositRecord.notes,
        },
      });

      // Update MemberStats
      const memberStats = await tx.memberStats.findUnique({
        where: { memberId: depositRecord.user.memberId },
      });

      if (memberStats) {
        await tx.memberStats.update({
          where: { memberId: depositRecord.user.memberId },
          data: {
            totalDeposited: {
              increment: depositRecord.depositAmount,
            },
            totalPenalties: {
              increment: depositRecord.penalty,
            },
            totalContribution: {
              increment: depositRecord.totalAmount,
            },
            totalMonthsPaid: {
              increment: 1,
            },
            consecutiveMonths: {
              increment: 1,
            },
            lastDepositDate: depositRecord.paymentDate,
            lastDepositMonth: depositRecord.depositMonth,
          },
        });
      } else {
        // Create MemberStats if doesn't exist
        await tx.memberStats.create({
          data: {
            memberId: depositRecord.user.memberId,
            totalDeposited: depositRecord.depositAmount,
            totalPenalties: depositRecord.penalty,
            totalContribution: depositRecord.totalAmount,
            totalMonthsPaid: 1,
            consecutiveMonths: 1,
            lastDepositDate: depositRecord.paymentDate,
            lastDepositMonth: depositRecord.depositMonth,
          },
        });
      }

      // Log approval in AuditLog
      await tx.auditLog.create({
        data: {
          action: 'DEPOSIT_APPROVED',
          entityType: 'Deposit',
          entityId: updated.id,
          performedBy: adminMemberId,
          performedByName: adminName,
          newValue: {
            status: 'APPROVED',
            approvedAt: new Date().toISOString(),
            notes: dto.notes,
          },
        },
      });

      return updated;
    });

    try {
      const depositMonth = new Date(updatedDeposit.depositMonth);
      const monthString = depositMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      // Get support email from config or use from email
      const supportEmail =
        this.configService.get<string>(ENVEnum.SMTP_FROM_EMAIL) ||
        this.configService.get<string>(ENVEnum.SMTP_USER) ||
        'support@example.com';

      //      email: string,
      // userName: string,
      // depositAmount: number,
      // depositMonth: string,
      // memberId: number,
      await this.emailService.sendDepositApprovalEmail(
        depositRecord.user.email,
        depositRecord.user.name,
        Number(updatedDeposit.depositAmount),
        monthString,
        depositRecord.user.memberId,
      );
    } catch (error) {
      // Log error but don't fail the rejection
      this.logger.error(
        `Failed to send approval email to ${depositRecord.user.email}:`,
        error,
      );
    }

    return successResponse(
      {
        id: updatedDeposit.id,
        memberId: depositRecord.user.memberId,
        memberName: depositRecord.user.name,
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: adminName,
      },
      'Deposit request approved successfully',
    );
  }

  /**
   * 🔹 Reject deposit request
   */
  @HandleError('Failed to reject deposit request')
  async rejectDepositRequest(
    depositId: string,
    dto: RejectDepositRequestDto,
    adminMemberId: number,
  ) {
    // Get admin info
    const admin = await this.prisma.user.findUnique({
      where: { memberId: adminMemberId },
      select: { name: true },
    });

    const adminName = admin?.name || 'Admin';

    const depositRecord = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            memberId: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!depositRecord) {
      throw new NotFoundException('Deposit request not found');
    }

    if (depositRecord.status === PaymentStatus.REJECTED) {
      throw new BadRequestException('Deposit is already rejected');
    }

    if (depositRecord.status === PaymentStatus.APPROVED) {
      throw new BadRequestException(
        'Cannot reject an approved deposit. Please handle this through other means.',
      );
    }

    // Update deposit status to REJECTED
    const updatedDeposit = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: PaymentStatus.REJECTED,
          rejectionReason: dto.rejectionReason,
        },
      });

      // Log rejection in AuditLog
      await tx.auditLog.create({
        data: {
          action: 'DEPOSIT_REJECTED',
          entityType: 'Deposit',
          entityId: updated.id,
          performedBy: adminMemberId,
          performedByName: adminName,
          newValue: {
            status: 'REJECTED',
            rejectionReason: dto.rejectionReason,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      return updated;
    });

    // Send rejection email (don't fail if email fails)
    try {
      const depositMonth = new Date(updatedDeposit.depositMonth);
      const monthString = depositMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      // Get support email from config or use from email
      const supportEmail =
        this.configService.get<string>(ENVEnum.SMTP_FROM_EMAIL) ||
        this.configService.get<string>(ENVEnum.SMTP_USER) ||
        'support@example.com';

      await this.emailService.sendDepositRejectionEmail(
        depositRecord.user.email,
        depositRecord.user.name,
        Number(updatedDeposit.depositAmount),
        monthString,
        dto.rejectionReason,
        supportEmail,
      );
    } catch (error) {
      // Log error but don't fail the rejection
      this.logger.error(
        `Failed to send rejection email to ${depositRecord.user.email}:`,
        error,
      );
    }

    return successResponse(
      {
        id: updatedDeposit.id,
        memberId: depositRecord.user.memberId,
        memberName: depositRecord.user.name,
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
        rejectedAt: new Date(),
        rejectedBy: adminName,
      },
      'Deposit request rejected successfully',
    );
  }

  /**
   * 🔹 Calculate statistics for deposit requests
   */
  private async calculateStats(
    where: Prisma.DepositWhereInput,
  ): Promise<DepositRequestStatsDto> {
    const [total, pending, approved, rejected, amountStats, penaltyStats] =
      await Promise.all([
        this.prisma.deposit.count({ where }),
        this.prisma.deposit.count({
          where: { ...where, status: PaymentStatus.PENDING },
        }),
        this.prisma.deposit.count({
          where: { ...where, status: PaymentStatus.APPROVED },
        }),
        this.prisma.deposit.count({
          where: { ...where, status: PaymentStatus.REJECTED },
        }),
        this.prisma.deposit.aggregate({
          where: { ...where },
          _sum: { depositAmount: true },
        }),
        this.prisma.deposit.aggregate({
          where: { ...where },
          _sum: { penalty: true },
        }),
      ]);

    return {
      total,
      pending,
      approved,
      rejected,
      totalAmount: Number(amountStats._sum.depositAmount || 0),
      totalPenalties: Number(penaltyStats._sum.penalty || 0),
    };
  }

  /**
   * 🔹 Format payment method for display
   */
  private formatPaymentMethod(method: PaymentMethod): string {
    const methodMap: Record<PaymentMethod, string> = {
      [PaymentMethod.BKASH]: 'bKash',
      [PaymentMethod.NAGAD]: 'Nagad',
      [PaymentMethod.ROCKET]: 'Rocket',
      [PaymentMethod.BANK_TRANSFER]: 'Bank Transfer',
      [PaymentMethod.HAND_TO_HAND]: 'Cash',
    };

    return methodMap[method] || method;
  }

  /**
   * 🔹 Map database status to frontend status
   */
  private mapStatusToFrontend(status: PaymentStatus): string {
    const statusMap: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'pending',
      [PaymentStatus.APPROVED]: 'approved',
      [PaymentStatus.REJECTED]: 'rejected',
      [PaymentStatus.CANCELLED]: 'cancelled',
    };

    return statusMap[status] || status;
  }
}
