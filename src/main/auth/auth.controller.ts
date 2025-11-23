import { Body, Controller, Post, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import { LoginDto, RegisterUserDto } from './dto/auth.dto';

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
  async getMe(@GetUser('userId') userId: string) {
    return await this.authService.getMe(userId);
  }
}
