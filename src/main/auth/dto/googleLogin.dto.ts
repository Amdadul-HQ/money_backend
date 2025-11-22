// dto/googleCredential.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleLoginDto {
  @ApiProperty({ example: 'asdfsag-fgasdgaaf-gas', description: 'User code' })
  @IsString()
  code: string;
}

export class GoogleCredentialDto {
  @ApiProperty({
    description: 'Google JWT credential token from @react-oauth/google',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjU5NTU...',
  })
  @IsString()
  @IsNotEmpty()
  credential: string;
}
