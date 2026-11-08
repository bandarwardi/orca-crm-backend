import { ApiProperty } from '@nestjs/swagger';

export class CustomerResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' })
  tenant_id: string;

  @ApiProperty({ example: 'محمد علي' })
  name: string;

  @ApiProperty({ example: '+13135550199' })
  phone: string;

  @ApiProperty({ example: 'mohammed@example.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'Dearborn' })
  city: string;

  @ApiProperty({ example: 'MI', nullable: true })
  state: string | null;

  @ApiProperty({ example: '13600 Michigan Ave, Dearborn, MI 48126', nullable: true })
  address: string | null;

  @ApiProperty({ example: 42.3223, nullable: true })
  lat: number | null;

  @ApiProperty({ example: -83.1763, nullable: true })
  lng: number | null;

  @ApiProperty({ example: 'referral', nullable: true })
  source: string | null;

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
