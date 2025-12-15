import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RequireAdmin } from 'src/common/jwt/admin.decorator';
import { successResponse } from 'src/common/utils/response.util';
import { BlockUserDto, SuspendUserDto, UserListQueryDto } from './dto/admin.dto';
import { Body, Delete, Param, Patch, Query } from '@nestjs/common';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) { }

  /**
   * 🔹 Get admin overview dashboard
   */
  @Get('overview')
  @RequireAdmin()
  @ApiOperation({ summary: 'Get admin overview dashboard' })
  async getOverview() {
    const data = await this.adminService.getOverview();
    return successResponse(data, 'Admin overview retrieved successfully');
  }

  /**
   * 🔹 Get all users
   */
  @Get('users')
  @RequireAdmin()
  @ApiOperation({ summary: 'Get all users with pagination and filtering' })
  async getAllUsers(@Query() query: UserListQueryDto) {
    const data = await this.adminService.getAllUsers(query);
    return successResponse(data, 'Users retrieved successfully');
  }

  /**
   * 🔹 Get user details
   */
  @Get('users/:id')
  @RequireAdmin()
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async getUserDetails(@Param('id') id: string) {
    const data = await this.adminService.getUserDetails(id);
    return successResponse(data, 'User details retrieved successfully');
  }

  /**
   * 🔹 Block a user
   */
  @Patch('users/:id/block')
  @RequireAdmin()
  @ApiOperation({ summary: 'Block a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: BlockUserDto })
  async blockUser(@Param('id') id: string, @Body() dto: BlockUserDto) {
    const data = await this.adminService.blockUser(id, dto);
    return successResponse(data, data.message);
  }

  /**
   * 🔹 Suspend a user
   */
  @Patch('users/:id/suspend')
  @RequireAdmin()
  @ApiOperation({ summary: 'Suspend a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: SuspendUserDto })
  async suspendUser(@Param('id') id: string, @Body() dto: SuspendUserDto) {
    const data = await this.adminService.suspendUser(id, dto);
    return successResponse(data, data.message);
  }

  /**
   * 🔹 Remove (Delete) a user
   */
  @Delete('users/:id')
  @RequireAdmin()
  @ApiOperation({ summary: 'Remove (delete) a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async removeUser(@Param('id') id: string) {
    const data = await this.adminService.removeUser(id);
    return successResponse(data, data.message);
  }

  /**
   * 🔹 Activate a user
   */
  @Patch('users/:id/activate')
  @RequireAdmin()
  @ApiOperation({ summary: 'Activate a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  async activateUser(@Param('id') id: string) {
    const data = await this.adminService.activateUser(id);
    return successResponse(data, data.message);
  }
}
