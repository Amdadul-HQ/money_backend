import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserRequestService } from './user-request.service';
import { UserRequestController } from './user-request.controller';
import { DepositRequestService } from './deposit-request.service';
import { DepositRequestController } from './deposit-request.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { UtilsModule } from 'src/common/utils/utils.module';
import { EmailModule } from 'src/common/email/email.module';
import { AdminGuard } from 'src/common/jwt/admin.guard';

@Module({
  imports: [PrismaModule, UtilsModule, EmailModule],
  controllers: [
    AdminController,
    UserRequestController,
    DepositRequestController,
  ],
  providers: [
    AdminService,
    UserRequestService,
    DepositRequestService,
    AdminGuard,
  ],
  exports: [AdminService, UserRequestService, DepositRequestService],
})
export class AdminModule {}
