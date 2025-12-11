import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DepositService } from './deposit.service';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import {
  CreateDepositDto,
  UpdateDepositDto,
  QueryDepositDto,
} from './dto/deposit.dto';

@ApiTags('Deposits')
@Controller('deposits')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DepositController {
  constructor(private readonly depositService: DepositService) { }

  /**
   * 🔹 Create a new deposit
   */
  @Post()
  @ApiOperation({ summary: 'Create a new deposit' })
  async createDeposit(
    @Body() createDepositDto: CreateDepositDto,
    @GetUser('userId') userId: string,
  ) {
    return await this.depositService.createDeposit(createDepositDto, userId);
  }

  /**
   * 🔹 Get member overview (dashboard statistics)
   */
  @Get('overview')
  @ApiOperation({ summary: 'Get member overview dashboard data' })
  async getMemberOverview(@GetUser('userId') userId: string) {
    return await this.depositService.getMemberOverview(userId);
  }

  /**
   * 🔹 Get all deposits for authenticated user
   */
  @Get()
  @ApiOperation({ summary: 'Get all deposits for authenticated user' })
  async getAllDeposits(
    @Query() queryDto: QueryDepositDto,
    @GetUser('userId') userId: string,
  ) {
    return await this.depositService.getAllDeposits(queryDto, userId);
  }

  /**
   * 🔹 Get single deposit by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get deposit by ID' })
  async getDepositById(
    @Param('id') depositId: string,
    @GetUser('userId') userId: string,
  ) {
    return await this.depositService.getDepositById(depositId, userId);
  }

  /**
   * 🔹 Update deposit (only PENDING deposits)
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update deposit (only PENDING deposits)' })
  async updateDeposit(
    @Param('id') depositId: string,
    @Body() updateDepositDto: UpdateDepositDto,
    @GetUser('userId') userId: string,
  ) {
    return await this.depositService.updateDeposit(
      depositId,
      updateDepositDto,
      userId,
    );
  }

  /**
   * 🔹 Delete deposit (only PENDING deposits)
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete deposit (only PENDING deposits)' })
  async deleteDeposit(
    @Param('id') depositId: string,
    @GetUser('userId') userId: string,
  ) {
    return await this.depositService.deleteDeposit(depositId, userId);
  }
}
