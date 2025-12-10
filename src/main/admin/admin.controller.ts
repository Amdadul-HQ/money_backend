import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { RequireAdmin } from 'src/common/jwt/admin.decorator';
import { successResponse } from 'src/common/utils/response.util';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
}
