import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsNotEmpty, 
  IsUUID, 
  IsOptional, 
  IsString, 
  IsNumber, 
  Min, 
  IsEnum,
  IsDateString,
  MaxLength,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../entities/order.entity';

export class CreateCustomerNestedDto {
  @ApiPropertyOptional({ description: 'Customer full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ description: 'Customer phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Customer city' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Customer address' })
  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateDeviceNestedDto {
  @ApiProperty({ description: 'Device name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsString()
  @IsOptional()
  device_type?: string;

  @ApiPropertyOptional({ description: 'MAC address' })
  @IsString()
  @IsOptional()
  mac_address?: string;

  @ApiPropertyOptional({ description: 'Device key' })
  @IsString()
  @IsOptional()
  device_key?: string;

  @ApiPropertyOptional({ description: 'Username' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'App name' })
  @IsString()
  @IsOptional()
  app_name?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'ID of the customer' })
  @IsUUID('4')
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Customer data if creating or linking directly', type: CreateCustomerNestedDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerNestedDto)
  customer?: CreateCustomerNestedDto;

  @ApiPropertyOptional({ description: 'ID of the associated lead, if any' })
  @IsUUID('4')
  @IsOptional()
  lead_id?: string;

  @ApiPropertyOptional({ description: 'ID of the assigned user/sales rep' })
  @IsUUID('4')
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Manual package name or description' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  package_name?: string;

  @ApiProperty({ description: 'Duration of the subscription in months' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  duration_months: number;

  @ApiPropertyOptional({ description: 'Number of allowed devices', default: 1 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  allowed_devices?: number;

  @ApiProperty({ description: 'Agreed price' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Server name' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  server_name?: string;

  @ApiPropertyOptional({ description: 'Start date of the subscription (defaults to now)' })
  @IsDateString()
  @IsOptional()
  starts_at?: string;

  @ApiPropertyOptional({ description: 'Initial status', enum: OrderStatus, default: OrderStatus.ACTIVE })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Devices associated with this order', type: [CreateDeviceNestedDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateDeviceNestedDto)
  devices?: CreateDeviceNestedDto[];
}
