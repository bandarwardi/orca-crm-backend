import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InitiateCallDto {
  @ApiProperty({ description: 'رقم هاتف العميل المراد الاتصال به' })
  @IsString()
  to: string;

  @ApiPropertyOptional({ description: 'معرف رقم الهاتف في Meta (اختياري)' })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiProperty({ description: 'SDP Offer من المتصفح (WebRTC)' })
  @IsString()
  sdpOffer: string;
}

export class AcceptCallDto {
  @ApiProperty({ description: 'معرف المكالمة من Meta' })
  @IsString()
  callId: string;

  @ApiProperty({ description: 'معرف رقم الهاتف في Meta' })
  @IsString()
  phoneNumberId: string;

  @ApiProperty({ description: 'SDP Answer من المتصفح (WebRTC)' })
  @IsString()
  sdpAnswer: string;
}

export class RejectCallDto {
  @ApiProperty({ description: 'معرف المكالمة من Meta' })
  @IsString()
  callId: string;

  @ApiProperty({ description: 'معرف رقم الهاتف في Meta' })
  @IsString()
  phoneNumberId: string;
}

export class EndCallDto {
  @ApiProperty({ description: 'معرف المكالمة من Meta' })
  @IsString()
  callId: string;

  @ApiProperty({ description: 'معرف رقم الهاتف في Meta' })
  @IsString()
  phoneNumberId: string;
}

