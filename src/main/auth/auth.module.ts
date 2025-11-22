import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CloudinaryService } from 'src/lib/cloudinary/cloudinary.service';
import { OAuth2Client } from 'google-auth-library';
@Module({
  providers: [AuthService, CloudinaryService, OAuth2Client],
  controllers: [AuthController],
  // imports: [OAuth2Client],
})
export class AuthModule {}
