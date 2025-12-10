import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRequestService } from './user-request.service';
import { RequireAdmin } from 'src/common/jwt/admin.decorator';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import { PrismaService } from 'src/common/prisma/prisma.service';
import {
  QueryUserRequestDto,
  ApproveUserRequestDto,
  RejectUserRequestDto,
  CreateUserDto,
} from './dto/user-request.dto';

@ApiTags('Admin - User Requests')
@Controller('admin/user-requests')
export class UserRequestController {
  constructor(
    private readonly userRequestService: UserRequestService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 🔹 Get all user registration requests
   */
  @Get()
  @RequireAdmin()
  @ApiOperation({ summary: 'Get all user registration requests' })
  async getAllUserRequests(@Query() queryDto: QueryUserRequestDto) {
    return await this.userRequestService.getAllUserRequests(queryDto);
  }

  /**
   * 🔹 Get single user request by ID
   */
  @Get(':id')
  @RequireAdmin()
  @ApiOperation({ summary: 'Get user request by ID' })
  async getUserRequestById(@Param('id') requestId: string) {
    return await this.userRequestService.getUserRequestById(requestId);
  }

  /**
   * 🔹 Approve user registration request
   */
  @Put(':id/approve')
  @RequireAdmin()
  @ApiOperation({ summary: 'Approve user registration request' })
  async approveUserRequest(
    @Param('id') requestId: string,
    @Body() dto: ApproveUserRequestDto,
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

    return await this.userRequestService.approveUserRequest(
      requestId,
      dto,
      admin.memberId,
    );
  }

  /**
   * 🔹 Reject user registration request
   */
  @Put(':id/reject')
  @RequireAdmin()
  @ApiOperation({ summary: 'Reject user registration request' })
  async rejectUserRequest(
    @Param('id') requestId: string,
    @Body() dto: RejectUserRequestDto,
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

    return await this.userRequestService.rejectUserRequest(
      requestId,
      dto,
      admin.memberId,
    );
  }

  /**
   * 🔹 Create user manually (Admin can add users)
   */
  @Post()
  @RequireAdmin()
  @ApiOperation({ summary: 'Create user manually (Admin only)' })
  async createUser(@Body() dto: CreateUserDto) {
    return await this.userRequestService.createUser(dto);
  }
}
