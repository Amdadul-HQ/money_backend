import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UtilsModule } from 'src/common/utils/utils.module';
import { PrismaModule } from 'src/common/prisma/prisma.module';

@Module({
    imports: [UtilsModule, PrismaModule],
    controllers: [UserController],
    providers: [UserService],
    exports: [UserService],
})
export class UserModule { }
