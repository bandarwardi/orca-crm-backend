import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { DeviceStatus, DeviceType } from '../../orders/entities/device.entity';

export class SearchDevicesDto {
  @ApiPropertyOptional({ description: 'Search query for MAC address, device key, username, or name' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ enum: DeviceStatus, description: 'Filter by device status' })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiPropertyOptional({ enum: DeviceType, description: 'Filter by device type' })
  @IsEnum(DeviceType)
  @IsOptional()
  device_type?: DeviceType;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsUUID('4')
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsUUID('4')
  @IsOptional()
  order_id?: string;
}
