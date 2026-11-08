import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateRingcentralConfigDto {
  @ApiPropertyOptional({ description: 'RingCentral Server URL' })
  @IsString()
  @IsOptional()
  server_url?: string;

  @ApiPropertyOptional({ description: 'RingCentral Client ID' })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({ description: 'RingCentral Client Secret' })
  @IsString()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional({ description: 'RingCentral JWT Token' })
  @IsString()
  @IsOptional()
  jwt_token?: string;

  @ApiPropertyOptional({ description: 'RingCentral Main Phone Number' })
  @IsString()
  @IsOptional()
  main_phone_number?: string;

  @ApiPropertyOptional({ description: 'Webhook Verification Token' })
  @IsString()
  @IsOptional()
  webhook_verify_token?: string;

  @ApiPropertyOptional({ description: 'Enable RingCentral Integration' })
  @IsBoolean()
  @IsOptional()
  is_enabled?: boolean;
}

export class TestRingcentralConnectionDto {
  @ApiPropertyOptional({ description: 'Server URL for testing' })
  @IsString()
  @IsOptional()
  server_url?: string;

  @ApiPropertyOptional({ description: 'Client ID for testing' })
  @IsString()
  @IsOptional()
  client_id?: string;

  @ApiPropertyOptional({ description: 'Client Secret for testing' })
  @IsString()
  @IsOptional()
  client_secret?: string;

  @ApiPropertyOptional({ description: 'JWT Token for testing' })
  @IsString()
  @IsOptional()
  jwt_token?: string;
}
