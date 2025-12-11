import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * Response DTO for file upload
 */
export class UploadDocumentResponseDto {
    @ApiProperty({
        description: 'Cloudinary public ID of the uploaded file',
        example: 'documents/abc123def456',
    })
    @IsString()
    @IsNotEmpty()
    publicId: string;

    @ApiProperty({
        description: 'Secure URL of the uploaded file',
        example: 'https://res.cloudinary.com/demo/image/upload/v1234567890/documents/abc123def456.jpg',
    })
    @IsString()
    @IsNotEmpty()
    secureUrl: string;

    @ApiProperty({
        description: 'Original filename',
        example: 'document.pdf',
    })
    @IsString()
    @IsNotEmpty()
    originalName: string;

    @ApiProperty({
        description: 'File format/extension',
        example: 'pdf',
    })
    @IsString()
    @IsNotEmpty()
    format: string;

    @ApiProperty({
        description: 'Resource type (image, raw, video, auto)',
        example: 'image',
    })
    @IsString()
    @IsNotEmpty()
    resourceType: string;

    @ApiProperty({
        description: 'File size in bytes',
        example: 102400,
    })
    bytes: number;
}

/**
 * Optional metadata for file upload
 */
export class UploadMetadataDto {
    @ApiProperty({
        description: 'Folder name in Cloudinary (default: "documents")',
        example: 'user-documents',
        required: false,
    })
    @IsString()
    @IsOptional()
    folder?: string;

    @ApiProperty({
        description: 'Tags for the uploaded file',
        example: ['invoice', 'receipt'],
        required: false,
    })
    @IsOptional()
    tags?: string[];
}
