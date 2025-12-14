import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { DepositModule } from './deposit/deposit.module';
import { AdminModule } from './admin/admin.module';
import { ImportModule } from './import/import.module';
import { DocumentModule } from './document/document.module';

import { UserModule } from './user/user.module';

@Module({
  imports: [AuthModule, DepositModule, AdminModule, DocumentModule, ImportModule, UserModule],
  controllers: [],
  providers: [],
})
export class MainModule { }
