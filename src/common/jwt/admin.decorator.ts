import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt.guard';
import { AdminGuard } from './admin.guard';

export function RequireAdmin() {
  return applyDecorators(UseGuards(JwtAuthGuard, AdminGuard), ApiBearerAuth());
}
