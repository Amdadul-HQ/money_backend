import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { successResponse } from 'src/common/utils/response.util';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UtilsService } from 'src/common/utils/utils.service';
import { LoginDto, RegisterUserDto } from './dto/auth.dto';
import { HandleError } from 'src/common/error/handle-error.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
  ) {}

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

        return successResponse({ user, token }, 'User registered successfully');
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
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User does not exist');
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

    return successResponse({ user, token }, 'Login successful');
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

    return successResponse(user, 'User profile retrieved successfully');
  }
}
