import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepositRequestService } from './deposit-request.service';
import { RequireAdmin } from 'src/common/jwt/admin.decorator';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  QueryDepositRequestDto,
  ApproveDepositRequestDto,
  RejectDepositRequestDto,
} from './dto/deposit-request.dto';

@ApiTags('Admin - Deposit Requests')
@Controller('admin/deposit-requests')
export class DepositRequestController {
  constructor(
    private readonly depositRequestService: DepositRequestService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 🔹 Get all deposit requests with filters
   */
  @Get()
  @RequireAdmin()
  @ApiOperation({ summary: 'Get all deposit requests with filters' })
  async getAllDepositRequests(@Query() queryDto: QueryDepositRequestDto) {
    return await this.depositRequestService.getAllDepositRequests(queryDto);
  }

  /**
   * 🔹 Get single deposit request by ID
   */
  @Get(':id')
  @RequireAdmin()
  @ApiOperation({ summary: 'Get deposit request by ID' })
  async getDepositRequestById(@Param('id') depositId: string) {
    return await this.depositRequestService.getDepositRequestById(depositId);
  }

  /**
   * 🔹 Approve deposit request
   */
  @Put(':id/approve')
  @RequireAdmin()
  @ApiOperation({ summary: 'Approve deposit request' })
  async approveDepositRequest(
    @Param('id') depositId: string,
    @Body() dto: ApproveDepositRequestDto,
    @GetUser('userId') userId: string,
  ) {
    // Get admin's memberId
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return await this.depositRequestService.approveDepositRequest(
      depositId,
      dto,
      admin.memberId,
    );
  }

  /**
   * 🔹 Reject deposit request
   */
  @Put(':id/reject')
  @RequireAdmin()
  @ApiOperation({ summary: 'Reject deposit request' })
  async rejectDepositRequest(
    @Param('id') depositId: string,
    @Body() dto: RejectDepositRequestDto,
    @GetUser('userId') userId: string,
  ) {
    // Get admin's memberId
    const admin = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberId: true },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return await this.depositRequestService.rejectDepositRequest(
      depositId,
      dto,
      admin.memberId,
    );
  }
}
