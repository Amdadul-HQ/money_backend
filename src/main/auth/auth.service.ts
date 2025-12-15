import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { successResponse } from 'src/common/utils/response.util';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { EmailService } from 'src/common/email/email.service';
import {
  LoginDto,
  RegisterUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { HandleError } from 'src/common/error/handle-error.decorator';
import { ENVEnum } from 'src/common/enum/env.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * 🔹 Register user with email/password + social links
   */
  @HandleError('Failed to register user')
  async register(dto: RegisterUserDto) {
    try {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email, phone: dto.phone },
      });

      if (existingUser) {
        throw new BadRequestException('User already exists');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            password: hashedPassword,
            fatherName: dto.fatherName,
            motherName: dto.motherName,
            occupation: dto.occupation,
            nid: dto.nid,
          },
        });

        const token = this.libUtils.generateToken({
          email: user.email,
          roles: user.role,
          sub: user.id,
        });

        const refreshToken = this.libUtils.generateRefreshToken({
          email: user.email,
          roles: user.role,
          sub: user.id,
        });

        // Save refresh token to database
        const expiresIn = this.configService.get<string>(
          ENVEnum.JWT_REFRESH_EXPIRES_IN,
          '7d',
        );
        const expiresAt = this.calculateExpiryDate(expiresIn);

        await tx.refreshToken.create({
          data: {
            userId: user.id,
            token: refreshToken,
            expiresAt,
          },
        });

        return successResponse(
          { user, token, refreshToken },
          'User registered successfully',
        );
      });
    } catch (err) {
      console.error('REGISTER ERROR:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      throw new InternalServerErrorException(
        'Internal server error during registration',
      );
    }
  }

  /**
   * 🔹 Standard email/password login
   */
  @HandleError('Failed to login user')
  async login(loginDto: LoginDto) {
    const { loginType, login, password } = loginDto;

    // Find user based on login type
    let user: {
      id: string;
      email: string;
      password: string;
      role: string;
      status: string;
      memberId: number;
      name: string;
      phone: string;
    } | null = null;

    switch (loginType) {
      case 'email': {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(login)) {
          throw new BadRequestException('Invalid email address format');
        }
        user = await this.prisma.user.findUnique({
          where: { email: login },
        });
        break;
      }

      case 'phone': {
        // Normalize phone number (remove spaces, dashes, +)
        const normalizedPhone = login.replace(/[\s\-+]/g, '');
        // Try exact match first, then partial match
        user = await this.prisma.user.findFirst({
          where: {
            OR: [
              { phone: normalizedPhone },
              {
                phone: {
                  contains: normalizedPhone,
                },
              },
            ],
          },
        });
        break;
      }

      case 'memberid': {
        // Member ID is numeric, extract number from string if needed
        const memberIdNumber = parseInt(login.replace(/\D/g, ''), 10);
        if (isNaN(memberIdNumber)) {
          throw new BadRequestException('Invalid member ID format');
        }
        user = await this.prisma.user.findUnique({
          where: { memberId: memberIdNumber },
        });
        break;
      }

      default:
        throw new BadRequestException('Invalid login type');
    }

    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'Your account is not active. Please contact support.',
      );
    }

    const isPasswordMatch = await this.libUtils.comparePassword({
      password,
      hashedPassword: user.password,
    });

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    const token = this.libUtils.generateToken({
      email: user.email,
      roles: user.role,
      sub: user.id,
    });

    const refreshToken = this.libUtils.generateRefreshToken({
      email: user.email,
      roles: user.role,
      sub: user.id,
    });

    // Save refresh token to database
    const expiresIn = this.configService.get<string>(
      ENVEnum.JWT_REFRESH_EXPIRES_IN,
      '7d',
    );
    const expiresAt = this.calculateExpiryDate(expiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return successResponse(
      { user: userWithoutPassword, token, refreshToken },
      'Login successful',
    );
  }

  /**
   * 🔹 Generate Google OAuth URL
   */
  // getGoogleAuthUrl(): string {
  //   const scopes = [
  //     'https://www.googleapis.com/auth/userinfo.email',
  //     'https://www.googleapis.com/auth/userinfo.profile',
  //   ];

  //   const url = this.googleClient.generateAuthUrl({
  //     access_type: 'offline',
  //     scope: scopes,
  //     prompt: 'consent',
  //   });

  //   return url;
  // }

  /**
   * 🔹 Handle Google OAuth Callback (Authorization Code Flow)
   */
  // async handleGoogleCallback(code: string) {
  //   try {
  //     // Exchange code for tokens
  //     const { tokens } = await this.googleClient.getToken(code);
  //     this.googleClient.setCredentials(tokens);

  //     // Get user profile
  //     const oauth2 = google.oauth2({
  //       version: 'v2',
  //       auth: this.googleClient,
  //     });
  //     const { data: profile } = await oauth2.userinfo.get();

  //     if (!profile?.email) {
  //       throw new BadRequestException('Google profile does not contain email');
  //     }

  //     // Ensure email is a string
  //     return await this.processGoogleUser({
  //       email: String(profile.email),
  //       name: profile.name ?? null,
  //       picture: profile.picture ?? null,
  //     });
  //   } catch (error) {
  //     console.error('❌ Google OAuth Error:', error);

  //     if (
  //       error instanceof BadRequestException ||
  //       error instanceof UnauthorizedException
  //     ) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       'Failed to authenticate with Google',
  //     );
  //   }
  // }

  // /**
  //  * 🔹 Handle Google JWT Credential (from @react-oauth/google)
  //  */
  // async handleGoogleCredential(credential: string) {
  //   try {
  //     console.log('🔍 Verifying Google JWT credential...');

  //     // Verify the JWT token with Google
  //     const ticket = await this.googleClient.verifyIdToken({
  //       idToken: credential,
  //       audience: this.configService.getOrThrow<string>(
  //         ENVEnum.GOOGLE_CLIENT_ID,
  //       ),
  //     });

  //     const payload = ticket.getPayload();

  //     if (!payload || !payload.email) {
  //       throw new BadRequestException('Invalid Google credential');
  //     }

  //     console.log('✅ Google JWT verified:', payload.email);

  //     // Create profile object compatible with existing flow
  //     const profile = {
  //       email: payload.email,
  //       name: payload.name || 'Google User',
  //       picture: payload.picture,
  //     };

  //     return await this.processGoogleUser(profile);
  //   } catch (error) {
  //     console.error('❌ Google credential verification error:', error);

  //     if (error instanceof BadRequestException) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       'Failed to verify Google credential',
  //     );
  //   }
  // }

  /**
   * 🔹 Process Google User (Shared logic for both OAuth and JWT methods)
   */
  // private async processGoogleUser(profile: {
  //   email: string;
  //   name?: string | null;
  //   picture?: string | null;
  // }) {
  //   try {
  //     // Check if user exists
  //     let user = await this.prisma.user.findUnique({
  //       where: { email: profile.email },
  //       include: {
  //         socialMedia: true,
  //         userStats: true,
  //       },
  //     });

  //     if (user) {
  //       // Existing user - check if account is active
  //       if (user.status !== 'Active') {
  //         throw new UnauthorizedException(
  //           `Account is ${user.status.toLowerCase()}`,
  //         );
  //       }

  //       // Update last active and profile picture if not set
  //       await this.prisma.user.update({
  //         where: { id: user.id },
  //         data: {
  //           lastActiveAt: new Date(),
  //           profile: user.profile || profile.picture || null,
  //           isGoogle: true, // Mark as Google user if not already
  //         },
  //       });

  //       console.log('ℹ️ Existing user logged in:', user.email);
  //     } else {
  //       // Create new user with Google
  //       user = await this.prisma.$transaction(async (tx) => {
  //         const newUser = await tx.user.create({
  //           data: {
  //             name: profile.name || 'Google User',
  //             email: profile.email,
  //             profile: profile.picture || null,
  //             role: Role.USER,
  //             isGoogle: true,
  //             isVerified: true, // Google accounts are pre-verified
  //             phone: null,
  //             address: null,
  //           },
  //           include: {
  //             socialMedia: true,
  //             userStats: true,
  //           },
  //         });

  //         // Create auth record with placeholder password
  //         await tx.auth.create({
  //           data: {
  //             email: newUser.email,
  //             name: newUser.name,
  //             password: 'GOOGLE_OAUTH_USER',
  //             role: Role.USER,
  //             userId: newUser.id,
  //           },
  //         });

  //         // Initialize user stats
  //         await tx.userStats.create({
  //           data: {
  //             userId: newUser.id,
  //           },
  //         });

  //         return newUser;
  //       });

  //       console.log('✅ Created new Google user:', user.email);
  //     }

  //     // Generate JWT token
  //     const token = this.libUtils.generateToken({
  //       email: user.email,
  //       roles: user.role,
  //       sub: user.id,
  //     });

  //     const result = { user, token };

  //     return successResponse(result, 'Google login successful');
  //   } catch (error) {
  //     console.error('❌ Process Google User Error:', error);

  //     if (error instanceof UnauthorizedException) {
  //       throw error;
  //     }

  //     throw new InternalServerErrorException(
  //       'Failed to process Google authentication',
  //     );
  //   }
  // }

  /**
   * 🔹 Get current authenticated user profile
   */
  @HandleError('Failed to retrieve user profile')
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        deposits: true,
        memberStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Convert BigInt values to strings for JSON serialization
    const serializedUser = JSON.parse(
      JSON.stringify(userWithoutPassword, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );

    return successResponse(serializedUser, 'User profile retrieved successfully');
  }

  /**
   * 🔹 Request password reset (Forgot Password)
   */
  @HandleError('Failed to process password reset request')
  async forgotPassword(dto: ForgotPasswordDto) {
    const { email } = dto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Don't reveal if user exists or not (security best practice)
    // Always return success message to prevent email enumeration
    if (!user) {
      // Return success even if user doesn't exist to prevent email enumeration
      return successResponse(
        null,
        'If an account with that email exists, a password reset link has been sent.',
      );
    }

    // Check for recent password reset requests (rate limiting)
    const recentResetRequest = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
        createdAt: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    if (recentResetRequest) {
      // Don't reveal rate limiting to prevent abuse
      return successResponse(
        null,
        'If an account with that email exists, a password reset link has been sent.',
      );
    }

    // Invalidate all previous unused tokens for this user
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Generate reset token
    // Generate reset token
    const resetToken = this.libUtils.generatePasswordResetToken();

    let expiryMinutes = 15;
    try {
      const configExpiry = this.configService.get<string>(ENVEnum.PASSWORD_RESET_TOKEN_EXPIRY);
      if (configExpiry) {
        const parsed = parseInt(configExpiry, 10);
        if (!isNaN(parsed) && parsed > 0) {
          expiryMinutes = parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse PASSWORD_RESET_TOKEN_EXPIRY, using default 15m', e);
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    // Save reset token to database
    try {
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });
    } catch (error) {
      console.error('Failed to create password reset token:', error);
      throw new InternalServerErrorException('Failed to generate reset token');
    }

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name,
      );
    } catch (error) {
      // If email fails, still return success to prevent email enumeration
      console.error('Failed to send password reset email:', error);
    }

    return successResponse(
      null,
      'If an account with that email exists, a password reset link has been sent.',
    );
  }

  /**
   * 🔹 Reset password with token
   */
  @HandleError('Failed to reset password')
  async resetPassword(dto: ResetPasswordDto) {
    const { token, newPassword, confirmPassword } = dto;

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Find valid reset token
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is already used
    if (resetToken.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      // Mark as used to prevent reuse
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });
      throw new BadRequestException('Reset token has expired');
    }

    // Check if user still exists
    if (!resetToken.user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Update user password
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      // Invalidate all refresh tokens for security
      await tx.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revoked: false,
        },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
    });

    return successResponse(null, 'Password reset successfully');
  }

  /**
   * 🔹 Refresh access token using refresh token
   */
  @HandleError('Failed to refresh token')
  async refreshToken(dto: RefreshTokenDto) {
    const { refreshToken } = dto;

    try {
      this.libUtils.verifyRefreshToken(refreshToken);
    } catch (error) {
      console.error('❌ Refresh token verification error:', error);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Check if refresh token exists in database and is valid
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is revoked
    if (storedToken.revoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Mark as revoked
      await this.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if user still exists and is active
    if (!storedToken.user) {
      throw new NotFoundException('User not found');
    }

    // Generate new access token
    const newAccessToken = this.libUtils.generateToken({
      email: storedToken.user.email,
      roles: storedToken.user.role,
      sub: storedToken.user.id,
    });

    // Optionally rotate refresh token (security best practice)
    // For now, we'll keep the same refresh token
    // You can implement token rotation if needed

    return successResponse(
      { token: newAccessToken, refreshToken },
      'Token refreshed successfully',
    );
  }

  /**
   * 🔹 Revoke refresh token (logout)
   */
  @HandleError('Failed to revoke token')
  async revokeRefreshToken(refreshToken: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!token) {
      throw new NotFoundException('Refresh token not found');
    }

    if (token.revoked) {
      return successResponse(null, 'Token already revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    return successResponse(null, 'Token revoked successfully');
  }

  /**
   * Helper method to calculate expiry date from string (e.g., "7d", "24h")
   */
  private calculateExpiryDate(expiresIn: string): Date {
    const date = new Date();
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      // Default to 7 days if format is invalid
      date.setDate(date.getDate() + 7);
      return date;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        date.setDate(date.getDate() + value);
        break;
      case 'h':
        date.setHours(date.getHours() + value);
        break;
      case 'm':
        date.setMinutes(date.getMinutes() + value);
        break;
      case 's':
        date.setSeconds(date.getSeconds() + value);
        break;
      default:
        date.setDate(date.getDate() + 7);
    }

    return date;
  }

  /**
   * 🔹 Change Password
   */
  @HandleError('Failed to change password')
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = dto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('New password and confirm password do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordMatch = await this.libUtils.comparePassword({
      password: currentPassword,
      hashedPassword: user.password,
    });

    if (!isPasswordMatch) {
      throw new BadRequestException('Invalid current password');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Revoke all refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    return successResponse(null, 'Password changed successfully');
  }
}
