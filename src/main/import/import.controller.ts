import {
    Controller,
    Post,
    Get,
    UseInterceptors,
    UploadedFile,
    Body,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { RequireAdmin } from 'src/common/jwt/admin.decorator';
import { successResponse } from 'src/common/utils/response.util';
import { ImportConfigDto } from './dto/import.dto';

@ApiTags('Admin - Import')
@Controller('admin/import')
export class ImportController {
    constructor(private readonly importService: ImportService) { }

    /**
     * 🔹 Import users from Excel file
     */
    @Post('users')
    @RequireAdmin()
    @UseInterceptors(
        FileInterceptor('file', {
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
            fileFilter: (req, file, callback) => {
                const allowedMimeTypes = [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                ];

                if (!allowedMimeTypes.includes(file.mimetype)) {
                    return callback(
                        new BadRequestException(
                            'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
                        ),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiOperation({
        summary: 'Bulk import users from Excel file',
        description:
            'Upload an Excel file containing user data. Required columns: Name, Email, Phone. Optional columns: Father Name, Mother Name, Address, Occupation, NID, Reference Person, Reference Phone. Default password: User@123, Default status: ACTIVE',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Excel file (.xlsx or .xls)',
                },
                defaultPassword: {
                    type: 'string',
                    description: 'Default password for all imported users',
                    default: 'User@123',
                },
                defaultStatus: {
                    type: 'string',
                    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE', 'REJECTED'],
                    description: 'Default status for imported users',
                    default: 'ACTIVE',
                },
                skipDuplicates: {
                    type: 'boolean',
                    description: 'Skip duplicate users instead of failing',
                    default: true,
                },
            },
            required: ['file'],
        },
    })
    async importUsers(
        @UploadedFile() file: Express.Multer.File,
        @Body() config: ImportConfigDto,
    ) {
        const result = await this.importService.importUsersFromExcel(file, config);
        return successResponse(result, result.message);
    }

    /**
     * 🔹 Get template structure for Excel import
     */
    @Get('template')
    @RequireAdmin()
    @ApiOperation({
        summary: 'Get Excel template structure',
        description:
            'Returns the structure of the Excel file including required and optional columns with sample data',
    })
    async getTemplate() {
        const template = this.importService.getTemplateStructure();
        return successResponse(
            template,
            'Import template structure retrieved successfully',
        );
    }
}
