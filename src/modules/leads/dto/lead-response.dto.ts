import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadPriority, LeadStage } from '../entities/lead.entity';
import { CustomerResponseDto } from '../../customers/dto/customer-response.dto';
import { LeadNoteType } from '../entities/lead-note.entity';

export class LeadNoteResponseDto {
  @ApiProperty({ example: 'n0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'lead-uuid' })
  lead_id: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  author_id: string | null;

  @ApiProperty({ enum: LeadNoteType, example: LeadNoteType.GENERAL })
  type: LeadNoteType;

  @ApiProperty({ example: 'تم التواصل هاتفياً' })
  content: string;

  @ApiProperty()
  created_at: Date;
}

export class LeadResponseDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  id: string;

  @ApiProperty({ example: 'tenant-uuid' })
  tenant_id: string;

  @ApiProperty({ example: 'customer-uuid' })
  customer_id: string;

  @ApiProperty({ type: () => CustomerResponseDto })
  customer: CustomerResponseDto;

  @ApiPropertyOptional({ example: 'user-uuid' })
  assigned_to: string | null;

  @ApiProperty({ enum: LeadStage, example: LeadStage.INTERESTED })
  stage: LeadStage;

  @ApiProperty({ enum: LeadPriority, example: LeadPriority.MEDIUM })
  priority: LeadPriority;

  @ApiPropertyOptional({ example: 'إعلان فيسبوك' })
  source: string | null;

  @ApiPropertyOptional({ example: 120.0 })
  estimated_value: number | null;

  @ApiPropertyOptional({ example: '2026-10-01T14:00:00Z' })
  follow_up_at: Date | null;

  @ApiPropertyOptional({ example: 'السعر مناسب' })
  close_reason: string | null;

  @ApiPropertyOptional({ type: () => [LeadNoteResponseDto] })
  notes?: LeadNoteResponseDto[];

  @ApiProperty()
  created_at: Date;

  @ApiProperty()
  updated_at: Date;
}
