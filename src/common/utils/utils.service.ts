import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { plainToInstance } from 'class-transformer';
import { AppError } from 'src/common/error/handle-error.app';
import { JWTPayload } from 'src/common/jwt/jwt.interface';
import { ENVEnum } from 'src/common/enum/env.enum';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class UtilsService {
  private readonly saltRounds = 10;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  sanitizedResponse(sto: any, data: any) {
    return plainToInstance(sto, data, { excludeExtraneousValues: true });
  }

  removeDuplicateIds(ids: string[]) {
    return Array.from(new Set(ids));
  }

  // * AUTH UTILS
  async hash(value: string): Promise<string> {
    return bcrypt.hash(value, this.saltRounds);
  }

  async compare(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }

  generateToken(payload: JWTPayload): string {
    const expiresIn = this.configService.get<string>(ENVEnum.JWT_EXPIRES_IN) || '1h';

    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>(ENVEnum.JWT_SECRET),
      expiresIn: expiresIn,
    });

    return token;
  }

  generateRefreshToken(payload: JWTPayload): string {
    const refreshSecret = this.configService.get<string>(
      ENVEnum.JWT_REFRESH_SECRET,
    );
    const refreshExpiresIn = this.configService.get<string>(
      ENVEnum.JWT_REFRESH_EXPIRES_IN,
    ) || '7d';

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    const token = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn,
    });

    return token;
  }

  verifyRefreshToken(token: string): JWTPayload {
    const refreshSecret = this.configService.get<string>(
      ENVEnum.JWT_REFRESH_SECRET,
    );

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not configured');
    }

    try {
      return this.jwtService.verify<JWTPayload>(token, {
        secret: refreshSecret,
      });
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  generatePasswordResetToken(): string {
    // Generate a secure random token
    return crypto.randomBytes(32).toString('hex');
  }

  generateOtpAndExpiry(): { otp: number; expiryTime: Date } {
    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit code
    const expiryTime = new Date();
    expiryTime.setMinutes(expiryTime.getMinutes() + 10);
    return { otp, expiryTime };
  }

  async ensureUserExists(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
  }

  async ensureUsersExists(userIds: string[]) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });
    if (users.length !== userIds.length)
      throw new AppError(404, 'User not found');
    return users;
  }

  async getEmailById(id: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'User not found');
    return user.email;
  }

  async hashPassword({
    password,
    round = 6,
  }: {
    password: string;
    round?: number;
  }): Promise<string> {
    return bcrypt.hash(password, round);
  }

  async comparePassword({
    hashedPassword,
    password,
  }: {
    password: string;
    hashedPassword: string;
  }): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}
