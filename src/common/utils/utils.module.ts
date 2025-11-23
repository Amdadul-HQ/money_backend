import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UtilsService } from './utils.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UtilsService, JwtService],
  exports: [UtilsService],
})
export class UtilsModule {}
