import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { PrismaService } from 'src/lib/prisma/prisma.service';
import { RegisterUserDto } from './dto/auth.dto';
import { LoginDto } from './dto/login.dto';
import { UtilsService } from 'src/lib/utils/utils.service';
import { successResponse } from 'src/common/utils/response.util';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ENVEnum } from 'src/common/enum/env.enum';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly libUtils: UtilsService,
    private readonly googleClient: OAuth2Client,
    private readonly configService: ConfigService,
  ) {
    // Initialize OAuth2Client for both methods
    this.googleClient = new google.auth.OAuth2(
      ENVEnum.GOOGLE_CLIENT_ID,
      ENVEnum.GOOGLE_CLIENT_SECRET,
      ENVEnum.GOOGLE_REDIRECT_URI,
    );
  }

  /**
   * 🔹 Register user with email/password + social links
   */
  async register(dto: RegisterUserDto, file: string | null) {
    try {
      const existingUser = await this.prisma.user.findFirst({
        where: { email: dto.email },
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
            profile: file,
            role: Role.USER,
            isGoogle: false,
            isVerified: false,
          },
        });

        await tx.auth.create({
          data: {
            email: user.email,
            name: user.name,
            password: hashedPassword,
            role: Role.USER,
            userId: user.id,
          },
        });

        // Create social media links if provided
        const socialLinks = {
          facebook: dto.facebook,
          youtube: dto.youtube,
          twitter: dto.twitter,
          instagram: dto.instagram,
          pinterest: dto.pinterest,
          linkedin: dto.linkedin,
          tiktok: dto.tiktok,
        };

        if (Object.values(socialLinks).some(Boolean)) {
          await tx.userSocialMedia.create({
            data: {
              userId: user.id,
              ...socialLinks,
            },
          });
        }

        // Initialize user stats
        await tx.userStats.create({
          data: {
            userId: user.id,
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
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        socialMedia: true,
        userStats: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    if (user.status !== 'Active') {
      throw new UnauthorizedException(
        `Account is ${user.status.toLowerCase()}`,
      );
    }

    const credentials = await this.prisma.auth.findUnique({
      where: { userId: user.id },
    });

    if (!credentials?.password) {
      throw new NotFoundException('Credentials not found for this user');
    }

    // Check if this is a Google OAuth user
    if (user.isGoogle && credentials.password === 'GOOGLE_OAUTH_USER') {
      throw new BadRequestException(
        'This account uses Google Sign-In. Please login with Google.',
      );
    }

    const isPasswordMatch = await this.libUtils.comparePassword({
      password,
      hashedPassword: credentials.password,
    });

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid password');
    }

    // Update last active timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

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
  getGoogleAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];

    const url = this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    });

    return url;
  }

  /**
   * 🔹 Handle Google OAuth Callback (Authorization Code Flow)
   */
  async handleGoogleCallback(code: string) {
    try {
      // Exchange code for tokens
      const { tokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(tokens);

      // Get user profile
      const oauth2 = google.oauth2({
        version: 'v2',
        auth: this.googleClient,
      });
      const { data: profile } = await oauth2.userinfo.get();

      if (!profile?.email) {
        throw new BadRequestException('Google profile does not contain email');
      }

      // Ensure email is a string
      return await this.processGoogleUser({
        email: String(profile.email),
        name: profile.name ?? null,
        picture: profile.picture ?? null,
      });
    } catch (error) {
      console.error('❌ Google OAuth Error:', error);

      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to authenticate with Google',
      );
    }
  }

  /**
   * 🔹 Handle Google JWT Credential (from @react-oauth/google)
   */
  async handleGoogleCredential(credential: string) {
    try {
      console.log('🔍 Verifying Google JWT credential...');

      // Verify the JWT token with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: credential,
        audience: this.configService.getOrThrow<string>(
          ENVEnum.GOOGLE_CLIENT_ID,
        ),
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new BadRequestException('Invalid Google credential');
      }

      console.log('✅ Google JWT verified:', payload.email);

      // Create profile object compatible with existing flow
      const profile = {
        email: payload.email,
        name: payload.name || 'Google User',
        picture: payload.picture,
      };

      return await this.processGoogleUser(profile);
    } catch (error) {
      console.error('❌ Google credential verification error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to verify Google credential',
      );
    }
  }

  /**
   * 🔹 Process Google User (Shared logic for both OAuth and JWT methods)
   */
  private async processGoogleUser(profile: {
    email: string;
    name?: string | null;
    picture?: string | null;
  }) {
    try {
      // Check if user exists
      let user = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: {
          socialMedia: true,
          userStats: true,
        },
      });

      if (user) {
        // Existing user - check if account is active
        if (user.status !== 'Active') {
          throw new UnauthorizedException(
            `Account is ${user.status.toLowerCase()}`,
          );
        }

        // Update last active and profile picture if not set
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            lastActiveAt: new Date(),
            profile: user.profile || profile.picture || null,
            isGoogle: true, // Mark as Google user if not already
          },
        });

        console.log('ℹ️ Existing user logged in:', user.email);
      } else {
        // Create new user with Google
        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              name: profile.name || 'Google User',
              email: profile.email,
              profile: profile.picture || null,
              role: Role.USER,
              isGoogle: true,
              isVerified: true, // Google accounts are pre-verified
              phone: null,
              address: null,
            },
            include: {
              socialMedia: true,
              userStats: true,
            },
          });

          // Create auth record with placeholder password
          await tx.auth.create({
            data: {
              email: newUser.email,
              name: newUser.name,
              password: 'GOOGLE_OAUTH_USER',
              role: Role.USER,
              userId: newUser.id,
            },
          });

          // Initialize user stats
          await tx.userStats.create({
            data: {
              userId: newUser.id,
            },
          });

          return newUser;
        });

        console.log('✅ Created new Google user:', user.email);
      }

      // Generate JWT token
      const token = this.libUtils.generateToken({
        email: user.email,
        roles: user.role,
        sub: user.id,
      });

      const result = { user, token };

      return successResponse(result, 'Google login successful');
    } catch (error) {
      console.error('❌ Process Google User Error:', error);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to process Google authentication',
      );
    }
  }

  /**
   * 🔹 Get current authenticated user profile
   */
  async getMe(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          profile: true,
          isVerified: true,
          role: true,
          isGoogle: true,
          status: true,
          lastActiveAt: true,
          createdAt: true,
          updatedAt: true,
          socialMedia: {
            select: {
              facebook: true,
              youtube: true,
              twitter: true,
              instagram: true,
              pinterest: true,
              linkedin: true,
              tiktok: true,
            },
          },
          userStats: {
            select: {
              totalPosts: true,
              totalViews: true,
              totalLikes: true,
              totalComments: true,
              totalFollowers: true,
              totalFollowing: true,
              engagementRate: true,
              avgViewsPerPost: true,
            },
          },
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
              likedPosts: true,
              comments: true,
              savedPosts: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Update last active timestamp
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      });

      return successResponse(user, 'User profile retrieved successfully');
    } catch (error) {
      console.error('❌ Get Me Error:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to retrieve user profile');
    }
  }
}
