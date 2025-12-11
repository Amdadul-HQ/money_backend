import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { cloudinary } from 'src/common/config/cloudinary.config';
import { UploadDocumentResponseDto } from './dto/document.dto';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as fs from 'fs';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class DocumentService {
    /**
     * Upload a file to Cloudinary
     * @param file - Multer file object
     * @param folder - Optional folder name (default: 'documents')
     * @param tags - Optional tags for the file
     * @returns Upload response with file details
     */
    async uploadDocument(
        file: Express.Multer.File,
        folder: string = 'documents',
        tags?: string[],
    ): Promise<UploadDocumentResponseDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        try {
            // Upload to Cloudinary
            const result: UploadApiResponse = await new Promise(
                (resolve, reject) => {
                    cloudinary.uploader.upload(
                        file.path,
                        {
                            folder: folder,
                            tags: tags,
                            resource_type: 'auto', // Automatically detect resource type
                        },
                        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
                            if (error) reject(error);
                            else if (result) resolve(result);
                            else reject(new Error('Upload failed'));
                        },
                    );
                },
            );

            // Clean up temporary file
            await this.cleanupTempFile(file.path);

            // Return formatted response
            return {
                publicId: result.public_id,
                secureUrl: result.secure_url,
                originalName: file.originalname,
                format: result.format,
                resourceType: result.resource_type,
                bytes: result.bytes,
            };
        } catch (error) {
            // Clean up temporary file in case of error
            await this.cleanupTempFile(file.path);

            throw new BadRequestException(
                `Failed to upload file to Cloudinary: ${error.message}`,
            );
        }
    }

    /**
     * Delete a file from Cloudinary
     * @param publicId - Cloudinary public ID of the file
     * @returns Deletion result
     */
    async deleteDocument(publicId: string): Promise<{ message: string }> {
        if (!publicId) {
            throw new BadRequestException('Public ID is required');
        }

        try {
            const result = await cloudinary.uploader.destroy(publicId);

            if (result.result === 'ok') {
                return {
                    message: `Document with public ID "${publicId}" deleted successfully`,
                };
            } else if (result.result === 'not found') {
                throw new NotFoundException(
                    `Document with public ID "${publicId}" not found`,
                );
            } else {
                throw new BadRequestException(
                    `Failed to delete document: ${result.result}`,
                );
            }
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(
                `Failed to delete file from Cloudinary: ${error.message}`,
            );
        }
    }

    /**
     * Clean up temporary file
     * @param filePath - Path to temporary file
     */
    private async cleanupTempFile(filePath: string): Promise<void> {
        try {
            if (fs.existsSync(filePath)) {
                await unlinkAsync(filePath);
            }
        } catch (error) {
            console.error(`Failed to delete temporary file ${filePath}:`, error);
        }
    }
}
