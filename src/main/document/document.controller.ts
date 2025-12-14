import {
    Controller,
    Post,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UseGuards,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiConsumes,
    ApiBody,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { multerConfig } from 'src/common/config/multer.config';
import { UploadDocumentResponseDto, UploadMetadataDto } from './dto/document.dto';
import { JwtAuthGuard } from 'src/common/jwt/jwt.guard';
import { TResponse } from 'src/common/utils/response.util';

@ApiTags('Documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
    constructor(private readonly documentService: DocumentService) { }

    /**
     * 🔹 Upload a file to Cloudinary
     */
    @Post('upload')
    @ApiOperation({ summary: 'Upload a document to Cloudinary' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'File to upload (max 10MB)',
                },
                folder: {
                    type: 'string',
                    description: 'Optional folder name in Cloudinary',
                    example: 'user-documents',
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional tags for the file',
                    example: ['invoice', 'receipt'],
                },
            },
            required: ['file'],
        },
    })
    @UseInterceptors(FileInterceptor('file', multerConfig))
    async uploadDocument(
        @UploadedFile() file: Express.Multer.File,
        @Body() metadata?: UploadMetadataDto,
    ): Promise<TResponse<UploadDocumentResponseDto>> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        return await this.documentService.uploadDocument(
            file,
            metadata?.folder,
            metadata?.tags,
        );
    }

    /**
     * 🔹 Delete a file from Cloudinary
     */
    @Delete(':publicId')
    @ApiOperation({ summary: 'Delete a document from Cloudinary' })
    @ApiParam({
        name: 'publicId',
        description: 'Cloudinary public ID of the file (use URL-encoded slashes)',
        example: 'documents/abc123def456',
    })
    async deleteDocument(
        @Param('publicId') publicId: string,
    ): Promise<{ message: string }> {
        return await this.documentService.deleteDocument(publicId);
    }
}
