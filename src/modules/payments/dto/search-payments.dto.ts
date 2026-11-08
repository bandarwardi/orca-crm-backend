import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { PaymentStatus } from '../../orders/entities/payment.entity';

export class SearchPaymentsDto {
  @ApiPropertyOptional({ description: 'Search query for invoice number' })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Filter by payment status' })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Filter by order ID' })
  @IsUUID('4')
  @IsOptional()
  order_id?: string;
}
