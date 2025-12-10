import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import {
  LoginDto,
  RegisterUserDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 🔹 User Registration with profile upload
   */
  @Post('registration')
  @ApiOperation({ summary: 'User Registration' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return await this.authService.register(registerUserDto);
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
   * 🔹 Get Current User Profile (Protected Route)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Current User Profile' })
  async getMe(@GetUser('userId') userId: string) {
    return await this.authService.getMe(userId);
  }

  /**
   * 🔹 Request Password Reset (Forgot Password)
   */
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request Password Reset' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  /**
   * 🔹 Reset Password with Token
   */
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset Password with Token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  /**
   * 🔹 Refresh Access Token
   */
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh Access Token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * 🔹 Revoke Refresh Token (Logout)
   */
  @Post('logout')
  @ApiOperation({ summary: 'Revoke Refresh Token (Logout)' })
  async logout(@Body() refreshTokenDto: RefreshTokenDto) {
    return await this.authService.revokeRefreshToken(
      refreshTokenDto.refreshToken,
    );
  }
}
