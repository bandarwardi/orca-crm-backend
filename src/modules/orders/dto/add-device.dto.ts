import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, IsBoolean } from 'class-validator';
import { DeviceType, DeviceStatus } from '../entities/device.entity';

export class AddDeviceDto {
  @ApiProperty({ description: 'Name of the device' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: DeviceType, description: 'Type of the device' })
  @IsEnum(DeviceType)
  @IsNotEmpty()
  device_type: DeviceType;

  @ApiPropertyOptional({ description: 'Custom device type name if any' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  device_type_name?: string;

  @ApiPropertyOptional({ description: 'MAC address of the device' })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  mac_address?: string;

  @ApiPropertyOptional({ description: 'Device key' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  device_key?: string;

  @ApiPropertyOptional({ description: 'Username for the device' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  username?: string;

  @ApiPropertyOptional({ description: 'App name used' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  app_name?: string;

  @ApiPropertyOptional({ description: 'Quality tag (e.g., 4K, HD)' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  quality_tag?: string;

  @ApiPropertyOptional({ enum: DeviceStatus, default: DeviceStatus.ACTIVE })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiPropertyOptional({ description: 'Increase allowed devices slot if limit reached' })
  @IsBoolean()
  @IsOptional()
  upgrade_slot?: boolean;
}
