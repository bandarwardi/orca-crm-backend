import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { ChangeLeadStageDto } from './dto/change-stage.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { LeadSearchDto } from './dto/lead-search.dto';
import { LeadResponseDto, LeadNoteResponseDto } from './dto/lead-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء صفقة محتملة جديدة' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تم إنشاء الصفقة بنجاح',
    type: LeadResponseDto,
  })
  async create(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Body() createLeadDto: CreateLeadDto,
  ) {
    const lead = await this.leadsService.create(
      tenantId,
      createLeadDto,
      user?.userId,
    );
    return {
      data: lead,
      message: 'تم إنشاء العميل المحتمل بنجاح',
    };
  }

  @Get()
  @ApiOperation({ summary: 'استرجاع قائمة الصفقات (فلترة الكانبان والترقيم)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'قائمة الصفقات المحتملة مع بيانات الترقيم',
  })
  async findAll(@TenantId() tenantId: string, @Query() query: LeadQueryDto) {
    return this.leadsService.findAll(tenantId, query);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'بحث آمن في الصفقات عبر POST body (لحماية بيانات الاتصال)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'نتائج البحث في الصفقات',
    type: [LeadResponseDto],
  })
  async search(@TenantId() tenantId: string, @Body() searchDto: LeadSearchDto) {
    const results = await this.leadsService.search(tenantId, searchDto);
    return {
      data: results,
      total: results.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'استرجاع تفاصيل صفقة مع الـ Timeline الكامل والملاحظات' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تفاصيل الصفقة مع الملاحظات',
    type: LeadResponseDto,
  })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const lead = await this.leadsService.findOne(tenantId, id);
    return {
      data: lead,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات صفقة' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تحديث بيانات الصفقة بنجاح',
    type: LeadResponseDto,
  })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    const lead = await this.leadsService.update(tenantId, id, updateLeadDto);
    return {
      data: lead,
      message: 'تم تحديث بيانات الصفقة بنجاح',
    };
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'نقل مرحلة الكانبان (Kanban Drag & Drop) مع تسجيل ملاحظة تلقائية' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تغيير مرحلة الصفقة بنجاح',
    type: LeadResponseDto,
  })
  async changeStage(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changeStageDto: ChangeLeadStageDto,
  ) {
    const lead = await this.leadsService.changeStage(
      tenantId,
      id,
      changeStageDto,
      user?.userId,
    );
    return {
      data: lead,
      message: 'تم نقل المرحلة بنجاح',
    };
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'إضافة ملاحظة جديدة للخط الزمني (Timeline)' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تمت إضافة الملاحظة بنجاح',
    type: LeadNoteResponseDto,
  })
  async addNote(
    @TenantId() tenantId: string,
    @CurrentUser() user: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() noteDto: CreateLeadNoteDto,
  ) {
    const note = await this.leadsService.addNote(
      tenantId,
      id,
      noteDto,
      user?.userId,
    );
    return {
      data: note,
      message: 'تمت إضافة الملاحظة بنجاح',
    };
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'استرجاع سجل الملاحظات والأنشطة (Timeline Notes) لصفقة' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'قائمة ملاحظات الصفقة',
    type: [LeadNoteResponseDto],
  })
  async getNotes(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notes = await this.leadsService.getNotes(tenantId, id);
    return {
      data: notes,
      total: notes.length,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف صفقة' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالصفقة' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم حذف الصفقة بنجاح',
  })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.leadsService.remove(tenantId, id);
    return {
      message: 'تم حذف الصفقة بنجاح',
    };
  }
}
