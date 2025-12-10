import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { HandleError } from 'src/common/error/handle-error.decorator';
import {
  QueryUserRequestDto,
  UserRequestDto,
  ApproveUserRequestDto,
  RejectUserRequestDto,
  CreateUserDto,
} from './dto/user-request.dto';
import { MemberStatus, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
  ) {}

  /**
   * 🔹 Get all user registration requests (users with PENDING status)
   */
  @HandleError('Failed to retrieve user requests')
  async getAllUserRequests(dto: QueryUserRequestDto) {
    const page = dto.page || 1;
    const limit = dto.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      status: {
        in: [MemberStatus.PENDING, MemberStatus.ACTIVE, MemberStatus.REJECTED],
      },
    };

    // Search filter
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { phone: { contains: dto.search } },
        { nid: { contains: dto.search } },
      ];
    }

    // Status filter
    if (dto.status && dto.status !== 'All') {
      where.status = dto.status as MemberStatus;
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          nid: true,
          address: true,
          occupation: true,
          registrationFee: true,
          status: true,
          memberId: true,
          createdAt: true,
          referencePerson: true,
          referencePhone: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Get approval/rejection info from AuditLog for all users
    const userIds = users.map((u) => u.id);
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'User',
        entityId: { in: userIds },
        action: { in: ['USER_APPROVED', 'USER_REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Create a map for quick lookup
    const auditMap = new Map<string, typeof auditLogs[0]>();
    auditLogs.forEach((log) => {
      if (!auditMap.has(log.entityId)) {
        auditMap.set(log.entityId, log);
      }
    });

    // Transform to UserRequestDto format
    const requests: UserRequestDto[] = users.map((user) => {
      const auditLog = auditMap.get(user.id);
      let rejectionReason: string | undefined;
      let rejectedBy: string | undefined;
      let rejectedDate: Date | undefined;
      let approvedBy: string | undefined;
      let approvedDate: Date | undefined;

      if (auditLog) {
        if (auditLog.action === 'USER_REJECTED') {
          rejectionReason = (auditLog.newValue as any)?.rejectionReason;
          rejectedDate = auditLog.createdAt;
          rejectedBy = auditLog.performedByName || 'Admin';
        } else if (auditLog.action === 'USER_APPROVED') {
          approvedDate = auditLog.createdAt;
          approvedBy = auditLog.performedByName || 'Admin';
        }
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        nidNumber: user.nid || '',
        address: user.address || '',
        occupation: user.occupation || '',
        emergencyContact: user.referencePhone || '',
        emergencyContactName: user.referencePerson || '',
        emergencyContactRelation: 'N/A',
        registrationFee: user.registrationFee,
        paymentMethod: 'N/A', // Payment method not stored in User model
        transactionId: 'N/A',
        paymentDate: user.createdAt,
        requestDate: user.createdAt,
        status: this.mapStatusToFrontend(user.status),
        accountType: 'Standard', // Default, can be enhanced
        referredBy: user.referencePerson
          ? `${user.referencePerson}${user.referencePhone ? ` (${user.referencePhone})` : ''}`
          : 'Self Registration',
        memberId: user.memberId,
        additionalNotes: '',
        rejectionReason,
        rejectedBy,
        rejectedDate,
        approvedBy,
        approvedDate,
      };
    });

    return successResponse(
      {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      'User requests retrieved successfully',
    );
  }

  /**
   * 🔹 Get single user request by ID
   */
  @HandleError('Failed to retrieve user request')
  async getUserRequestById(requestId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        nid: true,
        address: true,
        occupation: true,
        fatherName: true,
        motherName: true,
        registrationFee: true,
        status: true,
        memberId: true,
        createdAt: true,
        updatedAt: true,
        referencePerson: true,
        referencePhone: true,
        joiningDate: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User request not found');
    }

    // Get rejection reason from AuditLog if rejected
    let rejectionReason: string | undefined;
    let rejectedBy: string | undefined;
    let rejectedDate: Date | undefined;
    let approvedBy: string | undefined;
    let approvedDate: Date | undefined;

    if (user.status === MemberStatus.REJECTED) {
      const rejectionLog = await this.prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: user.id,
          action: 'USER_REJECTED',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (rejectionLog) {
        rejectionReason = (rejectionLog.newValue as any)?.rejectionReason;
        rejectedDate = rejectionLog.createdAt;
        rejectedBy = rejectionLog.performedByName || 'Admin';
      }
    } else if (user.status === MemberStatus.ACTIVE) {
      const approvalLog = await this.prisma.auditLog.findFirst({
        where: {
          entityType: 'User',
          entityId: user.id,
          action: 'USER_APPROVED',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (approvalLog) {
        approvedDate = approvalLog.createdAt;
        approvedBy = approvalLog.performedByName || 'Admin';
      }
    }

    const request: UserRequestDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      nidNumber: user.nid || '',
      address: user.address || '',
      occupation: user.occupation || '',
      emergencyContact: user.referencePhone || '',
      emergencyContactName: user.referencePerson || '',
      emergencyContactRelation: 'N/A',
      registrationFee: user.registrationFee,
      paymentMethod: 'N/A',
      transactionId: 'N/A',
      paymentDate: user.createdAt,
      requestDate: user.createdAt,
      status: this.mapStatusToFrontend(user.status),
      accountType: 'Standard',
      referredBy: user.referencePerson
        ? `${user.referencePerson}${user.referencePhone ? ` (${user.referencePhone})` : ''}`
        : 'Self Registration',
      memberId: user.memberId,
      additionalNotes: '',
      rejectionReason,
      rejectedBy,
      rejectedDate,
      approvedBy,
      approvedDate,
    };

    return successResponse(request, 'User request retrieved successfully');
  }

  /**
   * 🔹 Approve user registration request
   */
  @HandleError('Failed to approve user request')
  async approveUserRequest(
    requestId: string,
    dto: ApproveUserRequestDto,
    adminMemberId: number,
  ) {
    // Get admin info
    const admin = await this.prisma.user.findUnique({
      where: { memberId: adminMemberId },
      select: { name: true },
    });

    const adminName = admin?.name || 'Admin';
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
    });

    if (!user) {
      throw new NotFoundException('User request not found');
    }

    if (user.status === MemberStatus.ACTIVE) {
      throw new BadRequestException('User is already approved');
    }

    if (user.status === MemberStatus.REJECTED) {
      throw new BadRequestException(
        'Cannot approve a rejected user. Please create a new request.',
      );
    }

    // Update user status to ACTIVE
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: requestId },
        data: {
          status: MemberStatus.ACTIVE,
          joiningDate: new Date(),
        },
      });

      // Create MemberStats if not exists
      await tx.memberStats.upsert({
        where: { memberId: user.memberId },
        update: {},
        create: {
          memberId: user.memberId,
        },
      });

      return user;
    });

    return successResponse(
      {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        memberId: updatedUser.memberId,
        status: 'ACTIVE',
        approvedDate: new Date(),
      },
      'User request approved successfully',
    );
  }

  /**
   * 🔹 Reject user registration request
   */
  @HandleError('Failed to reject user request')
  async rejectUserRequest(
    requestId: string,
    dto: RejectUserRequestDto,
    adminMemberId: number,
  ) {
    // Get admin info
    const admin = await this.prisma.user.findUnique({
      where: { memberId: adminMemberId },
      select: { name: true },
    });

    const adminName = admin?.name || 'Admin';
    const user = await this.prisma.user.findUnique({
      where: { id: requestId },
    });

    if (!user) {
      throw new NotFoundException('User request not found');
    }

    if (user.status === MemberStatus.REJECTED) {
      throw new BadRequestException('User is already rejected');
    }

    if (user.status === MemberStatus.ACTIVE) {
      throw new BadRequestException(
        'Cannot reject an active user. Please suspend or deactivate instead.',
      );
    }

    // Update user status to REJECTED and log the action
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: requestId },
        data: {
          status: MemberStatus.REJECTED,
        },
      });

      // Store rejection in AuditLog
      await tx.auditLog.create({
        data: {
          action: 'USER_REJECTED',
          entityType: 'User',
          entityId: user.id,
          performedBy: adminMemberId,
          performedByName: adminName,
          newValue: {
            status: 'REJECTED',
            rejectionReason: dto.rejectionReason,
            rejectedAt: new Date().toISOString(),
          },
        },
      });

      return user;
    });

    return successResponse(
      {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        status: 'REJECTED',
        rejectionReason: dto.rejectionReason,
        rejectedDate: new Date(),
      },
      'User request rejected successfully',
    );
  }

  /**
   * 🔹 Create user manually (Admin can add users)
   */
  @HandleError('Failed to create user')
  async createUser(dto: CreateUserDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { phone: dto.phone },
          ...(dto.nid ? [{ nid: dto.nid }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        'User with this email, phone, or NID already exists',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          password: hashedPassword,
          fatherName: dto.fatherName,
          motherName: dto.motherName,
          address: dto.address,
          occupation: dto.occupation,
          nid: dto.nid,
          registrationFee: dto.registrationFee || 0,
          referencePerson: dto.referencePerson,
          referencePhone: dto.referencePhone,
          status: dto.status || MemberStatus.ACTIVE,
          joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : new Date(),
        },
      });

      // Create MemberStats if user is ACTIVE
      if (newUser.status === MemberStatus.ACTIVE) {
        await tx.memberStats.create({
          data: {
            memberId: newUser.memberId,
          },
        });
      }

      return newUser;
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user;

    return successResponse(
      {
        ...userWithoutPassword,
        memberId: user.memberId,
      },
      'User created successfully',
    );
  }

  /**
   * 🔹 Map database status to frontend status
   */
  private mapStatusToFrontend(status: MemberStatus): string {
    const statusMap: Record<MemberStatus, string> = {
      [MemberStatus.PENDING]: 'Pending',
      [MemberStatus.ACTIVE]: 'Approved',
      [MemberStatus.REJECTED]: 'Rejected',
      [MemberStatus.SUSPENDED]: 'Suspended',
      [MemberStatus.INACTIVE]: 'Inactive',
    };

    return statusMap[status] || status;
  }
}
