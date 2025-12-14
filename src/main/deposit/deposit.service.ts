import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { HandleError } from 'src/common/error/handle-error.decorator';
import {
  CreateDepositDto,
  UpdateDepositDto,
  QueryDepositDto,
} from './dto/deposit.dto';
import { PaymentMethod, PaymentStatus, MemberStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepositService {
  private readonly PENALTY_START_DAY = 16; // Penalty starts from 16th
  private readonly PENALTY_RATE = 30; // 30 BDT per 1000 BDT

  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
  ) { }

  /**
   * 🔹 Calculate penalty based on payment date and deposit month
   */
  private calculatePenalty(
    depositMonth: Date,
    paymentDate: Date,
    depositAmount: number,
  ): number {
    // Get the 15th of the deposit month
    const penaltyStartDate = new Date(depositMonth);
    penaltyStartDate.setDate(this.PENALTY_START_DAY);
    penaltyStartDate.setHours(0, 0, 0, 0);

    // If payment is after 15th, calculate penalty
    if (paymentDate > penaltyStartDate) {
      const penalty = Math.ceil((depositAmount / 1000) * this.PENALTY_RATE);
      return penalty;
    }

    return 0;
  }

  /**
   * 🔹 Validate user can access deposit (must be owner)
   */
  private async validateDepositOwnership(
    depositId: string,
    userId: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      select: { memberId: true },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    if (deposit.memberId !== user.memberId) {
      throw new ForbiddenException(
        'You do not have permission to access this deposit',
      );
    }
  }

  /**
   * 🔹 Validate user status (must be ACTIVE)
   */
  private async validateUserStatus(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true, memberId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== MemberStatus.ACTIVE) {
      throw new ForbiddenException(
        `Your account is ${user.status.toLowerCase()}. Only active members can create deposits.`,
      );
    }
  }

  /**
   * 🔹 Create deposit
   */
  @HandleError('Failed to create deposit')
  async createDeposit(dto: CreateDepositDto, userId: string) {
    // Validate user status
    await this.validateUserStatus(userId);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const depositMonth = new Date(dto.depositMonth);
    const paymentDate = dto.paymentDate
      ? new Date(dto.paymentDate)
      : new Date();

    // Check for duplicate deposit for the same month
    const existingDeposit = await this.prisma.deposit.findUnique({
      where: {
        memberId_depositMonth: {
          memberId: user.memberId,
          depositMonth: depositMonth,
        },
      },
    });

    if (existingDeposit) {
      throw new BadRequestException('A deposit for this month already exists');
    }

    // Calculate penalty
    const penalty = this.calculatePenalty(
      depositMonth,
      paymentDate,
      dto.depositAmount,
    );
    const totalAmount = dto.depositAmount + penalty;

    // Validate payment method specific details
    this.validatePaymentMethodDetails(dto.paymentMethod, dto);

    // Create deposit with payment method details
    const deposit = await this.prisma.$transaction(async (tx) => {
      // Create deposit
      const newDeposit = await tx.deposit.create({
        data: {
          memberId: user.memberId,
          depositMonth: depositMonth,
          depositAmount: BigInt(dto.depositAmount),
          penalty: BigInt(penalty),
          totalAmount: BigInt(totalAmount),
          paymentDate: paymentDate,
          paymentMethod: dto.paymentMethod,
          referencePerson: dto.referencePerson,
          proofImage: dto.proofImage,
          notes: dto.notes,
          status: PaymentStatus.PENDING,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              memberId: true,
            },
          },
        },
      });

      // Create payment method specific details
      if (
        dto.paymentMethod === PaymentMethod.HAND_TO_HAND &&
        dto.handToHandDetails
      ) {
        await tx.handToHandPayment.create({
          data: {
            depositId: newDeposit.id,
            receiverName: dto.handToHandDetails.receiverName,
            location: dto.handToHandDetails.location,
            handoverDate: new Date(dto.handToHandDetails.handoverDate),
            handoverTime: dto.handToHandDetails.handoverTime,
          },
        });
      } else if (
        (dto.paymentMethod === PaymentMethod.BKASH ||
          dto.paymentMethod === PaymentMethod.NAGAD ||
          dto.paymentMethod === PaymentMethod.ROCKET) &&
        dto.mobilePaymentDetails
      ) {
        await tx.mobilePayment.create({
          data: {
            depositId: newDeposit.id,
            provider: dto.mobilePaymentDetails.provider,
            phoneNumber: dto.mobilePaymentDetails.phoneNumber,
            transactionId: dto.mobilePaymentDetails.transactionId,
            transactionDate: dto.mobilePaymentDetails.transactionDate
              ? new Date(dto.mobilePaymentDetails.transactionDate)
              : new Date(),
          },
        });
      } else if (
        dto.paymentMethod === PaymentMethod.BANK_TRANSFER &&
        dto.bankTransferDetails
      ) {
        await tx.bankTransfer.create({
          data: {
            depositId: newDeposit.id,
            bankName: dto.bankTransferDetails.bankName,
            accountNumber: dto.bankTransferDetails.accountNumber,
            accountHolderName: dto.bankTransferDetails.accountHolderName,
            transactionRef: dto.bankTransferDetails.transactionRef,
          },
        });
      }

      // Fetch complete deposit with all relations
      return await tx.deposit.findUnique({
        where: { id: newDeposit.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              memberId: true,
            },
          },
          handToHandDetails: true,
          mobilePaymentDetails: true,
          bankTransferDetails: true,
        },
      });
    });

    return successResponse(
      this.libUtils.serializeBigInt(deposit),
      'Deposit created successfully',
    );
  }

  /**
   * 🔹 Get all deposits for authenticated user
   */
  @HandleError('Failed to retrieve deposits')
  async getAllDeposits(dto: QueryDepositDto, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.DepositWhereInput = {
      memberId: user.memberId,
    };

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.paymentMethod) {
      where.paymentMethod = dto.paymentMethod;
    }

    if (dto.startDate || dto.endDate) {
      where.depositMonth = {};
      if (dto.startDate) {
        where.depositMonth.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.depositMonth.lte = new Date(dto.endDate);
      }
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

    return successResponse(
      this.libUtils.serializeBigInt({
        deposits,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      'Deposits retrieved successfully',
    );
  }

  /**
   * 🔹 Get single deposit by ID
   */
  @HandleError('Failed to retrieve deposit')
  async getDepositById(depositId: string, userId: string) {
    // Validate ownership
    await this.validateDepositOwnership(depositId, userId);

    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberId: true,
          },
        },
        handToHandDetails: true,
        mobilePaymentDetails: true,
        bankTransferDetails: true,
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return successResponse(
      this.libUtils.serializeBigInt(deposit),
      'Deposit retrieved successfully',
    );
  }

  /**
   * 🔹 Update deposit (only if PENDING)
   */
  @HandleError('Failed to update deposit')
  async updateDeposit(
    depositId: string,
    dto: UpdateDepositDto,
    userId: string,
  ) {
    // Validate ownership
    await this.validateDepositOwnership(depositId, userId);

    const existingDeposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
      include: {
        handToHandDetails: true,
        mobilePaymentDetails: true,
        bankTransferDetails: true,
      },
    });

    if (!existingDeposit) {
      throw new NotFoundException('Deposit not found');
    }

    // Only allow update if status is PENDING
    if (existingDeposit.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update deposit with status ${existingDeposit.status}. Only PENDING deposits can be updated.`,
      );
    }

    // Validate user status
    await this.validateUserStatus(userId);

    // Prepare update data
    const updateData: Prisma.DepositUpdateInput = {};

    if (dto.depositAmount !== undefined) {
      // Recalculate penalty if deposit amount or payment date changes
      const depositMonth = existingDeposit.depositMonth;
      const paymentDate = dto.paymentDate
        ? new Date(dto.paymentDate)
        : existingDeposit.paymentDate;

      const penalty = this.calculatePenalty(
        depositMonth,
        paymentDate,
        dto.depositAmount,
      );
      const totalAmount = dto.depositAmount + penalty;

      updateData.depositAmount = BigInt(dto.depositAmount);
      updateData.penalty = BigInt(penalty);
      updateData.totalAmount = BigInt(totalAmount);
    }

    if (dto.paymentDate) {
      // Recalculate penalty if payment date changes
      const depositMonth = existingDeposit.depositMonth;
      const depositAmount =
        dto.depositAmount !== undefined
          ? dto.depositAmount
          : Number(existingDeposit.depositAmount);

      const penalty = this.calculatePenalty(
        depositMonth,
        new Date(dto.paymentDate),
        depositAmount,
      );
      const totalAmount = depositAmount + penalty;

      updateData.paymentDate = new Date(dto.paymentDate);
      updateData.penalty = BigInt(penalty);
      updateData.totalAmount = BigInt(totalAmount);
    }

    if (dto.paymentMethod !== undefined) {
      updateData.paymentMethod = dto.paymentMethod;
      // Validate payment method details if payment method is provided
      if (dto.paymentMethod) {
        this.validatePaymentMethodDetails(dto.paymentMethod, dto);
      }
    }

    if (dto.referencePerson) {
      updateData.referencePerson = dto.referencePerson;
    }

    if (dto.proofImage !== undefined) {
      updateData.proofImage = dto.proofImage;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    // Update deposit and payment method details
    const updatedDeposit = await this.prisma.$transaction(async (tx) => {
      // Update deposit
      const deposit = await tx.deposit.update({
        where: { id: depositId },
        data: updateData,
      });

      // Handle payment method details update
      const paymentMethodChanged =
        dto.paymentMethod !== undefined &&
        dto.paymentMethod !== existingDeposit.paymentMethod;

      if (paymentMethodChanged) {
        // Payment method changed - delete old and create new
        // Delete old payment method details
        if (existingDeposit.handToHandDetails) {
          await tx.handToHandPayment.deleteMany({
            where: { depositId },
          });
        }
        if (existingDeposit.mobilePaymentDetails) {
          await tx.mobilePayment.deleteMany({
            where: { depositId },
          });
        }
        if (existingDeposit.bankTransferDetails) {
          await tx.bankTransfer.deleteMany({
            where: { depositId },
          });
        }

        // Create new payment method details
        if (
          dto.paymentMethod === PaymentMethod.HAND_TO_HAND &&
          dto.handToHandDetails
        ) {
          await tx.handToHandPayment.create({
            data: {
              depositId: deposit.id,
              receiverName: dto.handToHandDetails.receiverName,
              location: dto.handToHandDetails.location,
              handoverDate: new Date(dto.handToHandDetails.handoverDate),
              handoverTime: dto.handToHandDetails.handoverTime,
            },
          });
        } else if (
          (dto.paymentMethod === PaymentMethod.BKASH ||
            dto.paymentMethod === PaymentMethod.NAGAD ||
            dto.paymentMethod === PaymentMethod.ROCKET) &&
          dto.mobilePaymentDetails
        ) {
          await tx.mobilePayment.create({
            data: {
              depositId: deposit.id,
              provider: dto.mobilePaymentDetails.provider,
              phoneNumber: dto.mobilePaymentDetails.phoneNumber,
              transactionId: dto.mobilePaymentDetails.transactionId,
              transactionDate: dto.mobilePaymentDetails.transactionDate
                ? new Date(dto.mobilePaymentDetails.transactionDate)
                : new Date(),
            },
          });
        } else if (
          dto.paymentMethod === PaymentMethod.BANK_TRANSFER &&
          dto.bankTransferDetails
        ) {
          await tx.bankTransfer.create({
            data: {
              depositId: deposit.id,
              bankName: dto.bankTransferDetails.bankName,
              accountNumber: dto.bankTransferDetails.accountNumber,
              accountHolderName: dto.bankTransferDetails.accountHolderName,
              transactionRef: dto.bankTransferDetails.transactionRef,
            },
          });
        }
      } else {
        // Payment method not changed - update existing details if provided
        if (dto.handToHandDetails && existingDeposit.handToHandDetails) {
          await tx.handToHandPayment.update({
            where: { depositId },
            data: {
              receiverName: dto.handToHandDetails.receiverName,
              location: dto.handToHandDetails.location,
              handoverDate: new Date(dto.handToHandDetails.handoverDate),
              handoverTime: dto.handToHandDetails.handoverTime,
            },
          });
        }
        if (dto.mobilePaymentDetails && existingDeposit.mobilePaymentDetails) {
          await tx.mobilePayment.update({
            where: { depositId },
            data: {
              provider: dto.mobilePaymentDetails.provider,
              phoneNumber: dto.mobilePaymentDetails.phoneNumber,
              transactionId: dto.mobilePaymentDetails.transactionId,
              transactionDate: dto.mobilePaymentDetails.transactionDate
                ? new Date(dto.mobilePaymentDetails.transactionDate)
                : existingDeposit.mobilePaymentDetails.transactionDate,
            },
          });
        }
        if (dto.bankTransferDetails && existingDeposit.bankTransferDetails) {
          await tx.bankTransfer.update({
            where: { depositId },
            data: {
              bankName: dto.bankTransferDetails.bankName,
              accountNumber: dto.bankTransferDetails.accountNumber,
              accountHolderName: dto.bankTransferDetails.accountHolderName,
              transactionRef: dto.bankTransferDetails.transactionRef,
            },
          });
        }
      }

      // Fetch complete deposit with all relations
      return await tx.deposit.findUnique({
        where: { id: depositId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              memberId: true,
            },
          },
          handToHandDetails: true,
          mobilePaymentDetails: true,
          bankTransferDetails: true,
        },
      });
    });

    return successResponse(
      this.libUtils.serializeBigInt(updatedDeposit),
      'Deposit updated successfully',
    );
  }

  /**
   * 🔹 Delete deposit (only if PENDING)
   */
  @HandleError('Failed to delete deposit')
  async deleteDeposit(depositId: string, userId: string) {
    // Validate ownership
    await this.validateDepositOwnership(depositId, userId);

    const deposit = await this.prisma.deposit.findUnique({
      where: { id: depositId },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    // Only allow delete if status is PENDING
    if (deposit.status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        `Cannot delete deposit with status ${deposit.status}. Only PENDING deposits can be deleted.`,
      );
    }

    // Delete deposit (cascade will handle related records)
    await this.prisma.deposit.delete({
      where: { id: depositId },
    });

    return successResponse(null, 'Deposit deleted successfully');
  }

  /**
   * 🔹 Get Member Overview - Dashboard statistics
   */
  @HandleError('Failed to retrieve member overview')
  async getMemberOverview(userId: string) {
    // Get user with member ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all APPROVED deposits for the user
    const deposits = await this.prisma.deposit.findMany({
      where: {
        memberId: user.memberId,
        status: PaymentStatus.APPROVED,
      },
      orderBy: {
        depositMonth: 'desc',
      },
    });

    // Calculate total reserved and total penalty
    const totalReserved = deposits.reduce(
      (sum, deposit) => sum + Number(deposit.depositAmount),
      0,
    );
    const totalPenalty = deposits.reduce(
      (sum, deposit) => sum + Number(deposit.penalty),
      0,
    );

    // Get current date info
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth(); // 0-11

    // Helper function to get days late
    const getDaysLate = (paymentDate: Date, depositMonth: Date): number => {
      const penaltyStartDate = new Date(depositMonth);
      penaltyStartDate.setDate(this.PENALTY_START_DAY);

      if (paymentDate > penaltyStartDate) {
        const diffTime = paymentDate.getTime() - penaltyStartDate.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
      return 0;
    };

    // Helper function to format month name
    const getMonthName = (date: Date): string => {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    // Get recent deposits (last 5)
    const recentDeposits = deposits.slice(0, 5).map((deposit) => {
      const daysLate = getDaysLate(deposit.paymentDate, deposit.depositMonth);
      const isPenalized = Number(deposit.penalty) > 0;

      return {
        month: getMonthName(deposit.depositMonth),
        amount: Number(deposit.depositAmount),
        date: deposit.paymentDate.toISOString().split('T')[0],
        penalty: Number(deposit.penalty),
        isPenalized,
        daysLate,
      };
    });

    // Build 12-month payment data for current year
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyPayments = monthNames.map((monthName, index) => {
      // Create date for this month of current year
      const monthDate = new Date(currentYear, index, 1);

      // Find deposit for this month
      const deposit = deposits.find((d) => {
        const depMonth = new Date(d.depositMonth);
        return (
          depMonth.getFullYear() === currentYear &&
          depMonth.getMonth() === index
        );
      });

      return {
        month: monthName,
        amount: deposit ? Number(deposit.depositAmount) : 0,
      };
    });

    // Check current month status
    const currentMonthDate = new Date(currentYear, currentMonthIndex, 1);
    const currentMonthDeposit = deposits.find((d) => {
      const depMonth = new Date(d.depositMonth);
      return (
        depMonth.getFullYear() === currentYear &&
        depMonth.getMonth() === currentMonthIndex
      );
    });

    const currentMonth = {
      month: getMonthName(currentMonthDate),
      amount: currentMonthDeposit ? Number(currentMonthDeposit.depositAmount) : 1000, // Default expected amount
      isPaid: !!currentMonthDeposit,
      paymentDate: currentMonthDeposit ? currentMonthDeposit.paymentDate.toISOString() : undefined,
      daysLate: currentMonthDeposit
        ? getDaysLate(currentMonthDeposit.paymentDate, currentMonthDeposit.depositMonth)
        : 0,
      penalty: currentMonthDeposit ? Number(currentMonthDeposit.penalty) : 0,
    };

    // Calculate summary statistics
    const last5MonthsTotal = recentDeposits.reduce((sum, d) => sum + d.amount, 0);
    const monthsPaid = deposits.length;
    const latePaymentsCount = deposits.filter((d) => Number(d.penalty) > 0).length;

    // Calculate average monthly (sum of all deposits / 12 months)
    const averageMonthly = monthsPaid > 0 ? Math.round(totalReserved / 12) : 0;

    const summaryStats = {
      last5MonthsTotal,
      averageMonthly,
      recentDepositsCount: recentDeposits.length,
      monthsPaid,
      latePaymentsCount,
    };

    const overview = {
      totalReserved,
      totalPenalty,
      currentMonth,
      recentDeposits,
      monthlyPayments,
      summaryStats,
    };

    return successResponse(
      this.libUtils.serializeBigInt(overview),
      'Member overview retrieved successfully',
    );
  }

  /**
   * 🔹 Validate payment method specific details
   */
  private validatePaymentMethodDetails(
    paymentMethod: PaymentMethod,
    dto: CreateDepositDto | UpdateDepositDto,
  ): void {
    switch (paymentMethod) {
      case PaymentMethod.HAND_TO_HAND:
        if (!dto.handToHandDetails) {
          throw new BadRequestException(
            'Hand to hand payment details are required',
          );
        }
        break;

      case PaymentMethod.BKASH:
      case PaymentMethod.NAGAD:
      case PaymentMethod.ROCKET:
        if (!dto.mobilePaymentDetails) {
          throw new BadRequestException('Mobile payment details are required');
        }
        break;

      case PaymentMethod.BANK_TRANSFER:
        if (!dto.bankTransferDetails) {
          throw new BadRequestException('Bank transfer details are required');
        }
        break;

      default:
        throw new BadRequestException('Invalid payment method');
    }
  }
}
