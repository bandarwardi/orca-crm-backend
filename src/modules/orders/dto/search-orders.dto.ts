import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { OrderStatus } from '../entities/order.entity';

export class SearchOrdersDto {
  @ApiPropertyOptional({ description: 'Search query for order number or customer name/phone' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by order status' })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsUUID('4')
  @IsOptional()
  customer_id?: string;
}
