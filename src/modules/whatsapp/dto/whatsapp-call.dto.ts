import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
