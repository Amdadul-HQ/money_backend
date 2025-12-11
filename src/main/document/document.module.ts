import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { CloudinaryProvider } from 'src/common/config/cloudinary.config';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [ConfigModule],
    controllers: [DocumentController],
    providers: [DocumentService, CloudinaryProvider],
    exports: [DocumentService],
})
export class DocumentModule { }
