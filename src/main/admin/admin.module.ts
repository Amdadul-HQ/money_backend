import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { UtilsModule } from 'src/common/utils/utils.module';
import { AdminGuard } from 'src/common/jwt/admin.guard';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
