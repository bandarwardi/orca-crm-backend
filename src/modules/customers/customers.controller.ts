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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerSearchDto } from './dto/customer-search.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('Customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء عميل جديد' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تم إنشاء العميل بنجاح',
    type: CustomerResponseDto,
  })
  async create(
    @TenantId() tenantId: string,
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    const customer = await this.customersService.create(tenantId, createCustomerDto);
    return {
      data: customer,
      message: 'تم إنشاء العميل بنجاح',
    };
  }

  @Get()
  @ApiOperation({ summary: 'استرجاع قائمة العملاء مع Pagination وفلاتر' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'قائمة العملاء مع بيانات الترقيم',
  })
  async findAll(
    @TenantId() tenantId: string,
    @Query() query: CustomerQueryDto,
  ) {
    return this.customersService.findAll(tenantId, query);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'بحث آمن في العملاء عبر POST body (لحماية الهواتف والعناوين الحساسة)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'نتائج البحث',
    type: [CustomerResponseDto],
  })
  async search(
    @TenantId() tenantId: string,
    @Body() searchDto: CustomerSearchDto,
  ) {
    const results = await this.customersService.search(tenantId, searchDto);
    return {
      data: results,
      total: results.length,
    };
  }

  @Get('map-pins')
  @ApiOperation({ summary: 'جلب إحداثيات المشتركين لخريطة المشتركين (Subscribers Map)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'قائمة العملاء الذين يملكون إحداثيات جغرافية',
  })
  async getMapPins(@TenantId() tenantId: string) {
    const pins = await this.customersService.getMapPins(tenantId);
    return {
      data: pins,
      total: pins.length,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'استرجاع تفاصيل عميل عبر الـ UUID' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالعميل' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'بيانات العميل',
    type: CustomerResponseDto,
  })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const customer = await this.customersService.findOne(tenantId, id);
    return {
      data: customer,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات عميل' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالعميل' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم تحديث بيانات العميل بنجاح',
    type: CustomerResponseDto,
  })
  async update(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    const customer = await this.customersService.update(
      tenantId,
      id,
      updateCustomerDto,
    );
    return {
      data: customer,
      message: 'تم تحديث بيانات العميل بنجاح',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف عميل' })
  @ApiParam({ name: 'id', description: 'UUID الخاص بالعميل' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'تم حذف العميل بنجاح',
  })
  async remove(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.customersService.remove(tenantId, id);
    return {
      message: 'تم حذف العميل بنجاح',
    };
  }
}
