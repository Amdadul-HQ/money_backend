import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/common/prisma/prisma.module';
import { UtilsModule } from 'src/common/utils/utils.module';
import { EmailModule } from 'src/common/email/email.module';

@Module({
  imports: [PrismaModule, UtilsModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
