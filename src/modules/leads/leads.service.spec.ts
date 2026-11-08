import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeadsService } from './leads.service';
import { Lead, LeadPriority, LeadStage } from './entities/lead.entity';
import { LeadNote, LeadNoteType } from './entities/lead-note.entity';
import { CustomersService } from '../customers/customers.service';

describe('LeadsService', () => {
  let service: LeadsService;
  let mockLeadRepo: any;
  let mockNoteRepo: any;
  let mockCustomersService: any;

  const mockTenantId = 'tenant-123-uuid';
  const otherTenantId = 'tenant-other-uuid';
  const mockCustomerId = 'customer-1-uuid';
  const mockUserId = 'user-1-uuid';

  const sampleLead: Partial<Lead> = {
    id: 'lead-1-uuid',
    tenant_id: mockTenantId,
    customer_id: mockCustomerId,
    assigned_to: mockUserId,
    stage: LeadStage.INTERESTED,
    priority: LeadPriority.HIGH,
    source: 'إعلان فيسبوك',
    estimated_value: 150.0,
    notes: [],
  };

  beforeEach(async () => {
    mockLeadRepo = {
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((entity) =>
        Promise.resolve({ id: entity.id || 'new-lead-id', ...entity }),
      ),
      findOne: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
      createQueryBuilder: vi.fn(),
    };

    mockNoteRepo = {
      create: vi.fn().mockImplementation((dto) => dto),
      save: vi.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'new-note-id', ...entity }),
      ),
      find: vi.fn(),
    };

    mockCustomersService = {
      findOne: vi.fn().mockResolvedValue({ id: mockCustomerId, tenant_id: mockTenantId }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: getRepositoryToken(Lead),
          useValue: mockLeadRepo,
        },
        {
          provide: getRepositoryToken(LeadNote),
          useValue: mockNoteRepo,
        },
        {
          provide: CustomersService,
          useValue: mockCustomersService,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  describe('create', () => {
    it('should verify customer tenant isolation, save lead, and create initial note if provided', async () => {
      mockLeadRepo.findOne.mockResolvedValue({ ...sampleLead, id: 'new-lead-id' });

      const createDto = {
        customer_id: mockCustomerId,
        assigned_to: mockUserId,
        stage: LeadStage.INTERESTED,
        priority: LeadPriority.HIGH,
        source: 'إعلان فيسبوك',
        estimated_value: 150.0,
        notes: 'ملاحظة أولية',
      };

      const result = await service.create(mockTenantId, createDto as any, mockUserId);

      expect(mockCustomersService.findOne).toHaveBeenCalledWith(mockTenantId, mockCustomerId);
      expect(mockLeadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          customer_id: mockCustomerId,
          stage: LeadStage.INTERESTED,
        }),
      );
      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          type: LeadNoteType.GENERAL,
          content: 'ملاحظة أولية',
        }),
      );
      expect(mockNoteRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'new-lead-id');
    });
  });

  describe('findOne', () => {
    it('should return lead with relations when found within tenant', async () => {
      mockLeadRepo.findOne.mockResolvedValue(sampleLead);

      const result = await service.findOne(mockTenantId, 'lead-1-uuid');

      expect(mockLeadRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'lead-1-uuid', tenant_id: mockTenantId },
        relations: {
          customer: true,
          assignedTo: true,
          notes: {
            author: true,
          },
        },
        order: { notes: { created_at: 'ASC' } },
      });
      expect(result).toEqual(sampleLead);
    });

    it('should throw NotFoundException if lead not found in tenant', async () => {
      mockLeadRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne(otherTenantId, 'lead-1-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeStage', () => {
    it('should update stage and create automated STATUS_CHANGE note in timeline', async () => {
      const existingLead = { ...sampleLead, stage: LeadStage.NEW };
      mockLeadRepo.findOne
        .mockResolvedValueOnce(existingLead)
        .mockResolvedValueOnce({ ...existingLead, stage: LeadStage.NEGOTIATION });

      const changeStageDto = {
        stage: LeadStage.NEGOTIATION,
        note: 'تم التواصل والاتفاق على السعر',
      };

      const result = await service.changeStage(
        mockTenantId,
        'lead-1-uuid',
        changeStageDto,
        mockUserId,
      );

      expect(mockLeadRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: LeadStage.NEGOTIATION,
        }),
      );
      expect(mockNoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: mockTenantId,
          type: LeadNoteType.STATUS_CHANGE,
          author_id: mockUserId,
        }),
      );
      expect(mockNoteRepo.save).toHaveBeenCalled();
      expect(result.stage).toBe(LeadStage.NEGOTIATION);
    });
  });

  describe('addNote', () => {
    it('should create and save a new timeline note', async () => {
      mockLeadRepo.findOne.mockResolvedValue(sampleLead);

      const noteDto = {
        type: LeadNoteType.CALL,
        content: 'مكالمة هاتفية مع العميل',
      };

      await service.addNote(mockTenantId, 'lead-1-uuid', noteDto, mockUserId);

      expect(mockNoteRepo.create).toHaveBeenCalledWith({
        tenant_id: mockTenantId,
        lead_id: 'lead-1-uuid',
        author_id: mockUserId,
        type: LeadNoteType.CALL,
        content: 'مكالمة هاتفية مع العميل',
      });
      expect(mockNoteRepo.save).toHaveBeenCalled();
    });
  });
});
