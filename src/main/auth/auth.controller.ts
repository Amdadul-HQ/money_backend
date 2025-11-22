import {
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { registerUserSwaggerSchema } from './dto/registration.swagger';
import { RegisterUserDto } from './dto/auth.dto';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { GoogleCredentialDto, GoogleLoginDto } from './dto/googleLogin.dto';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { GetUser } from 'src/common/jwt/jwt.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  /**
   * 🔹 User Registration with profile upload
   */
  @Post('registration')
  @ApiOperation({ summary: 'User Registration' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ...registerUserSwaggerSchema.properties,
      },
    },
  })
  @UseInterceptors(FileInterceptor('profile'))
  async register(
    @Body() registerUserDto: RegisterUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let uploadedUrl: { secure_url: string } | null = null;

    if (file) {
      uploadedUrl = await this.cloudinaryService.uploadImageFromBuffer(
        file.buffer,
        file.originalname,
      );
    }
    return await this.authService.register(
      registerUserDto,
      uploadedUrl ? uploadedUrl.secure_url : null,
    );
  }

  /**
   * 🔹 Standard Email/Password Login
   */
  @Post('login')
  @ApiOperation({ summary: 'User Login' })
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  /**
   * 🔹 Get Google OAuth URL - Initiates OAuth flow
   */
  @Get('google/url')
  @ApiOperation({ summary: 'Get Google OAuth URL' })
  getGoogleAuthUrl() {
    const url = this.authService.getGoogleAuthUrl();
    return {
      success: true,
      data: { url },
      message: 'Google OAuth URL generated',
    };
  }

  /**
   * 🔹 Google OAuth Callback - Exchange code for user data
   */
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth Callback' })
  async googleCallback(@Query('code') code: string, @Res() res: Response) {
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    try {
      const result = await this.authService.handleGoogleCallback(code);

      // Redirect to frontend with token
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/google/success?token=${result.data.token}`,
      );
    } catch (error) {
      console.error('Google callback error:', error);
      return res.redirect(
        `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
      );
    }
  }

  /**
   * 🔹 Google Login with Authorization Code (Alternative method)
   */
  @Post('google/login')
  @ApiOperation({ summary: 'Google Login with Authorization Code' })
  async handleGoogleCode(@Body() googleLoginDto: GoogleLoginDto) {
    return await this.authService.handleGoogleCallback(googleLoginDto.code);
  }

  /**
   * 🔹 Google Login with JWT Credential (from @react-oauth/google)
   */
  @Post('google/credential')
  @ApiOperation({ summary: 'Google Login with JWT Credential' })
  @ApiBody({
    description: 'Google JWT credential token from @react-oauth/google',
    type: GoogleCredentialDto,
  })
  async handleGoogleCredential(@Body() dto: GoogleCredentialDto) {
    return await this.authService.handleGoogleCredential(dto.credential);
  }

  /**
   * 🔹 Get Current User Profile (Protected Route)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description:
      'Returns detailed information about the currently logged-in user including stats, social media, and activity counts',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      example: {
        success: true,
        data: {
          id: 'clxxxxxxxxxxxxx',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          profile: 'https://example.com/profile.jpg',
          isVerified: true,
          role: 'USER',
          isGoogle: false,
          status: 'Active',
          lastActiveAt: '2024-01-15T10:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-15T10:30:00Z',
          socialMedia: {
            facebook: 'https://facebook.com/johndoe',
            youtube: 'https://youtube.com/@johndoe',
            twitter: 'https://twitter.com/johndoe',
            instagram: 'https://instagram.com/johndoe',
            pinterest: null,
            linkedin: 'https://linkedin.com/in/johndoe',
            tiktok: null,
          },
          userStats: {
            totalPosts: 25,
            totalViews: 1500,
            totalLikes: 320,
            totalComments: 89,
            totalFollowers: 145,
            totalFollowing: 98,
            engagementRate: 4.5,
            avgViewsPerPost: 60.0,
          },
          _count: {
            posts: 25,
            followers: 145,
            following: 98,
            likedPosts: 78,
            comments: 89,
            savedPosts: 34,
          },
        },
        message: 'User profile retrieved successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getMe(@GetUser('userId') userId: string) {
    return await this.authService.getMe(userId);
  }
}
