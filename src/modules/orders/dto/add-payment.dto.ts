import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsNumber, Min, IsDateString, IsOptional, MaxLength } from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class AddPaymentDto {
  @ApiProperty({ description: 'Amount paid' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'Payment method used' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  payment_method: string;

  @ApiPropertyOptional({ enum: PaymentStatus, default: PaymentStatus.PAID })
  @IsEnum(PaymentStatus)
  @IsOptional()
  status?: PaymentStatus;

  @ApiPropertyOptional({ description: 'Date of payment' })
  @IsDateString()
  @IsOptional()
  payment_date?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the payment' })
  @IsString()
  @IsOptional()
  notes?: string;
}
