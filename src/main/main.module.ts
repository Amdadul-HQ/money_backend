import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DepositModule } from './deposit/deposit.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [AuthModule, DepositModule, AdminModule],
  controllers: [],
  providers: [],
})
export class MainModule {}
