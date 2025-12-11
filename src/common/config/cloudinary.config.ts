import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { ENVEnum } from '../enum/env.enum';

export const CloudinaryProvider = {
    provide: 'CLOUDINARY',
    useFactory: (configService: ConfigService) => {
        return cloudinary.config({
            cloud_name: configService.get<string>(ENVEnum.CLOUDINARY_CLOUD_NAME),
            api_key: configService.get<string>(ENVEnum.CLOUDINARY_API_KEY),
            api_secret: configService.get<string>(ENVEnum.CLOUDINARY_API_SECRET),
        });
    },
    inject: [ConfigService],
};

export { cloudinary };
