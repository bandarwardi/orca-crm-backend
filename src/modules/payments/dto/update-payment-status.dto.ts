import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { PaymentStatus } from '../../orders/entities/payment.entity';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus, description: 'New status of the payment' })
  @IsEnum(PaymentStatus)
  @IsNotEmpty()
  status: PaymentStatus;
}
