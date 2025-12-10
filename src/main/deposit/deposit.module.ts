import { Module } from '@nestjs/common';
import { DepositService } from './deposit.service';
import { DepositController } from './deposit.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { UtilsModule } from 'src/common/utils/utils.module';

@Module({
  imports: [PrismaModule, UtilsModule],
  controllers: [DepositController],
  providers: [DepositService],
  exports: [DepositService],
})
export class DepositModule {}

