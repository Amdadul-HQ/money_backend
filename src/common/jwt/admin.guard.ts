import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequestWithUser } from './jwt.interface';
import { Role } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user?.userId) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check user role from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });

    if (!dbUser) {
      throw new ForbiddenException('User not found');
    }

    // Only ADMIN and SUPER_ADMIN can access
    if (dbUser.role !== Role.ADMIN && dbUser.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
