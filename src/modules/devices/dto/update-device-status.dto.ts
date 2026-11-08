import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { DeviceStatus } from '../../orders/entities/device.entity';

export class UpdateDeviceStatusDto {
  @ApiProperty({ enum: DeviceStatus, description: 'New status of the device' })
  @IsEnum(DeviceStatus)
  @IsNotEmpty()
  status: DeviceStatus;
}
