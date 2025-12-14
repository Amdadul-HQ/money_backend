import {
    Controller,
    Get,
    Body,
    UseGuards,
    Patch,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { GetUser } from 'src/common/jwt/jwt.decorator';
import {
    UpdateUserProfileDto,
    UserProfileResponseDto,
} from './dto/user-profile.dto';

@ApiTags('User')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
    constructor(private readonly userService: UserService) { }

    /**
     * 🔹 Get Current User Profile
     */
    @Get('profile')
    @ApiOperation({ summary: 'Get current user profile with details' })
    @ApiResponse({
        status: 200,
        description: 'User profile retrieved successfully',
        type: UserProfileResponseDto,
    })
    async getProfile(@GetUser('userId') userId: string) {
        return await this.userService.getProfile(userId);
    }

    /**
     * 🔹 Update User Profile
     */
    @Patch('profile')
    @ApiOperation({ summary: 'Update user profile information' })
    @ApiResponse({
        status: 200,
        description: 'User profile updated successfully',
        type: UserProfileResponseDto,
    })
    async updateProfile(
        @GetUser('userId') userId: string,
        @Body() dto: UpdateUserProfileDto,
    ) {
        return await this.userService.updateProfile(userId, dto);
    }
}
