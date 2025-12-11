import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { MemberStatus } from '@prisma/client';

/**
 * DTO for individual user data from Excel row
 */
export class ImportUserDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: '01712345678' })
    @IsString()
    phone: string;

    @ApiProperty({ example: 'Michael Doe', required: false })
    @IsOptional()
    @IsString()
    fatherName?: string;

    @ApiProperty({ example: 'Sarah Doe', required: false })
    @IsOptional()
    @IsString()
    motherName?: string;

    @ApiProperty({ example: 'Dhaka, Bangladesh', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: 'Software Engineer', required: false })
    @IsOptional()
    @IsString()
    occupation?: string;

    @ApiProperty({ example: '1234567890123', required: false })
    @IsOptional()
    @IsString()
    nid?: string;

    @ApiProperty({ example: 'Jane Smith', required: false })
    @IsOptional()
    @IsString()
    referencePerson?: string;

    @ApiProperty({ example: '01798765432', required: false })
    @IsOptional()
    @IsString()
    referencePhone?: string;
}

/**
 * Details about import errors for individual users
 */
export class ImportErrorDto {
    row: number;
    email?: string;
    name?: string;
    errors: string[];
}

/**
 * Response DTO for bulk user import
 */
export class ImportResponseDto {
    @ApiProperty({ example: 50 })
    totalRows: number;

    @ApiProperty({ example: 45 })
    successCount: number;

    @ApiProperty({ example: 5 })
    failedCount: number;

    @ApiProperty({ example: 3 })
    skippedCount: number;

    @ApiProperty({ type: [ImportErrorDto] })
    errors: ImportErrorDto[];

    @ApiProperty({ example: ['user1@example.com', 'user2@example.com'] })
    skippedEmails: string[];

    @ApiProperty({ example: 'Import completed: 45 users created, 3 skipped (duplicates), 5 failed' })
    message: string;
}

/**
 * DTO for import configuration
 */
export class ImportConfigDto {
    @ApiProperty({ example: 'User@123', required: false, description: 'Default password for all imported users' })
    @IsOptional()
    @IsString()
    defaultPassword?: string;

    @ApiProperty({ enum: MemberStatus, example: MemberStatus.ACTIVE, required: false })
    @IsOptional()
    @IsEnum(MemberStatus)
    defaultStatus?: MemberStatus;

    @ApiProperty({ example: true, required: false, description: 'Skip duplicate users instead of failing' })
    @IsOptional()
    skipDuplicates?: boolean;
}
