import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

// Allowed file types
const ALLOWED_FILE_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
        '.docx',
    ],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
        '.xlsx',
    ],
};

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const multerConfig = {
    storage: diskStorage({
        destination: './uploads/temp',
        filename: (req: Request, file: Express.Multer.File, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
            callback(null, filename);
        },
    }),
    fileFilter: (
        req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
        const allowedExtensions = ALLOWED_FILE_TYPES[file.mimetype];

        if (!allowedExtensions) {
            return callback(
                new BadRequestException(
                    `File type ${file.mimetype} is not allowed. Allowed types: images, PDFs, Word documents, Excel spreadsheets`,
                ),
                false,
            );
        }

        const fileExtension = extname(file.originalname).toLowerCase();
        if (!allowedExtensions.includes(fileExtension)) {
            return callback(
                new BadRequestException(
                    `File extension ${fileExtension} does not match MIME type ${file.mimetype}`,
                ),
                false,
            );
        }

        callback(null, true);
    },
    limits: {
        fileSize: MAX_FILE_SIZE,
    },
};
