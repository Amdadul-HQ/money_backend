import {
    Injectable,
    BadRequestException,
    InternalServerErrorException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { HandleError } from 'src/common/error/handle-error.decorator';
import {
    ImportUserDto,
    ImportResponseDto,
    ImportErrorDto,
    ImportConfigDto,
} from './dto/import.dto';
import { MemberStatus } from '@prisma/client';

@Injectable()
export class ImportService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * 🔹 Import users from Excel file
     */
    @HandleError('Failed to import users')
    async importUsersFromExcel(
        file: Express.Multer.File,
        config: ImportConfigDto = {},
    ): Promise<ImportResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate file type
        const allowedMimeTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                'Invalid file type. Please upload an Excel file (.xlsx or .xls)',
            );
        }

        try {
            // Parse Excel file
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, {
                raw: false,
                defval: null,
            });

            if (!rawData || rawData.length === 0) {
                throw new BadRequestException('Excel file is empty');
            }

            // Set default configuration
            const defaultPassword = config.defaultPassword || 'User@123';
            const defaultStatus = config.defaultStatus || MemberStatus.ACTIVE;
            const skipDuplicates = config.skipDuplicates !== false; // Default to true

            // Hash the default password once
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Process users
            const result: ImportResponseDto = {
                totalRows: rawData.length,
                successCount: 0,
                failedCount: 0,
                skippedCount: 0,
                errors: [],
                skippedEmails: [],
                message: '',
            };

            for (let i = 0; i < rawData.length; i++) {
                const row = rawData[i];
                const rowNumber = i + 2; // Excel row number (accounting for header)

                try {
                    // Map Excel columns to DTO
                    const userDto = this.mapRowToDto(row);

                    // Validate required fields
                    const validationErrors = this.validateUserDto(userDto);
                    if (validationErrors.length > 0) {
                        result.failedCount++;
                        result.errors.push({
                            row: rowNumber,
                            email: userDto.email,
                            name: userDto.name,
                            errors: validationErrors,
                        });
                        continue;
                    }

                    // Check for duplicates
                    const existingUser = await this.prisma.user.findFirst({
                        where: {
                            OR: [
                                { email: userDto.email },
                                { phone: userDto.phone },
                                ...(userDto.nid ? [{ nid: userDto.nid }] : []),
                            ],
                        },
                    });

                    if (existingUser) {
                        if (skipDuplicates) {
                            result.skippedCount++;
                            result.skippedEmails.push(userDto.email);
                            continue;
                        } else {
                            result.failedCount++;
                            result.errors.push({
                                row: rowNumber,
                                email: userDto.email,
                                name: userDto.name,
                                errors: ['User already exists with this email, phone, or NID'],
                            });
                            continue;
                        }
                    }

                    // Create user
                    await this.prisma.user.create({
                        data: {
                            name: userDto.name,
                            email: userDto.email.toLowerCase(),
                            phone: userDto.phone,
                            password: hashedPassword,
                            fatherName: userDto.fatherName || null,
                            motherName: userDto.motherName || null,
                            address: userDto.address || null,
                            nid: userDto.nid || null,
                            occupation: userDto.occupation || null,
                            referencePerson: userDto.referencePerson || null,
                            referencePhone: userDto.referencePhone || null,
                            status: defaultStatus,
                            joiningDate: new Date(),
                        },
                    });

                    result.successCount++;
                } catch (error) {
                    result.failedCount++;
                    result.errors.push({
                        row: rowNumber,
                        email: row.Email || row.email,
                        name: row.Name || row.name,
                        errors: [error.message || 'Failed to create user'],
                    });
                }
            }

            // Generate summary message
            result.message = this.generateSummaryMessage(result);

            return result;
        } catch (error) {
            console.error('Import error:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException(
                'Failed to process Excel file: ' + error.message,
            );
        }
    }

    /**
     * Map Excel row to ImportUserDto
     */
    private mapRowToDto(row: any): ImportUserDto {
        // Support multiple column name formats (case-insensitive)
        return {
            name:
                row.Name ||
                row.name ||
                row.NAME ||
                row['Full Name'] ||
                row['full name'] ||
                '',
            email:
                row.Email ||
                row.email ||
                row.EMAIL ||
                row['Email Address'] ||
                row['email address'] ||
                '',
            phone:
                row.Phone ||
                row.phone ||
                row.PHONE ||
                row['Phone Number'] ||
                row['phone number'] ||
                row['Mobile'] ||
                row['mobile'] ||
                '',
            fatherName:
                row.FatherName ||
                row.fatherName ||
                row['Father Name'] ||
                row['father name'] ||
                row["Father's Name"] ||
                null,
            motherName:
                row.MotherName ||
                row.motherName ||
                row['Mother Name'] ||
                row['mother name'] ||
                row["Mother's Name"] ||
                null,
            address: row.Address || row.address || row.ADDRESS || null,
            occupation: row.Occupation || row.occupation || row.OCCUPATION || null,
            nid: row.NID || row.nid || row['National ID'] || row['national id'] || null,
            referencePerson:
                row.ReferencePerson ||
                row.referencePerson ||
                row['Reference Person'] ||
                row['reference person'] ||
                row.Reference ||
                row.reference ||
                null,
            referencePhone:
                row.ReferencePhone ||
                row.referencePhone ||
                row['Reference Phone'] ||
                row['reference phone'] ||
                row['Reference Number'] ||
                row['reference number'] ||
                null,
        };
    }

    /**
     * Validate user DTO and return list of errors
     */
    private validateUserDto(dto: ImportUserDto): string[] {
        const errors: string[] = [];

        // Required field validations
        if (!dto.name || dto.name.trim() === '') {
            errors.push('Name is required');
        }

        if (!dto.email || dto.email.trim() === '') {
            errors.push('Email is required');
        } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.email)) {
                errors.push('Invalid email format');
            }
        }

        if (!dto.phone || dto.phone.trim() === '') {
            errors.push('Phone is required');
        } else {
            // Validate phone format (basic validation)
            const phoneRegex = /^[0-9+\-\s()]+$/;
            if (!phoneRegex.test(dto.phone)) {
                errors.push('Invalid phone format');
            }
        }

        // Optional field length validations
        if (dto.name && dto.name.length > 255) {
            errors.push('Name is too long (max 255 characters)');
        }

        return errors;
    }

    /**
     * Generate import summary message
     */
    private generateSummaryMessage(result: ImportResponseDto): string {
        const parts: string[] = [];

        parts.push(`Import completed: ${result.successCount} users created`);

        if (result.skippedCount > 0) {
            parts.push(`${result.skippedCount} skipped (duplicates)`);
        }

        if (result.failedCount > 0) {
            parts.push(`${result.failedCount} failed`);
        }

        return parts.join(', ');
    }

    /**
     * 🔹 Get import template structure (for generating sample file)
     */
    getTemplateStructure() {
        return {
            requiredColumns: ['Name', 'Email', 'Phone'],
            optionalColumns: [
                'Father Name',
                'Mother Name',
                'Address',
                'Occupation',
                'NID',
                'Reference Person',
                'Reference Phone',
            ],
            sampleData: [
                {
                    Name: 'John Doe',
                    Email: 'john.doe@example.com',
                    Phone: '01712345678',
                    'Father Name': 'Michael Doe',
                    'Mother Name': 'Sarah Doe',
                    Address: 'Dhaka, Bangladesh',
                    Occupation: 'Software Engineer',
                    NID: '1234567890123',
                    'Reference Person': 'Jane Smith',
                    'Reference Phone': '01798765432',
                },
                {
                    Name: 'Alice Johnson',
                    Email: 'alice.johnson@example.com',
                    Phone: '01823456789',
                    'Father Name': 'Robert Johnson',
                    'Mother Name': 'Emily Johnson',
                    Address: 'Chittagong, Bangladesh',
                    Occupation: 'Teacher',
                    NID: '9876543210987',
                    'Reference Person': 'Bob Williams',
                    'Reference Phone': '01787654321',
                },
            ],
        };
    }
}
