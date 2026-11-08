import { Controller, Post, Body, Get, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { SearchOrdersDto } from './dto/search-orders.dto';
import { AddDeviceDto } from './dto/add-device.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

// Assuming basic guards will be applied globally or per controller
// @UseGuards(JwtAuthGuard)
@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({ status: 200, description: 'List of orders' })
  findAll(@TenantId() tenantId: string) {
    return this.ordersService.search(tenantId, {});
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  create(@TenantId() tenantId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(tenantId, createOrderDto);
  }

  @Post('search')
  @ApiOperation({ summary: 'Search orders securely' })
  @ApiResponse({ status: 200, description: 'List of matching orders' })
  search(@TenantId() tenantId: string, @Body() searchDto: SearchOrdersDto) {
    return this.ordersService.search(tenantId, searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details including devices and payments' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.ordersService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(tenantId, id, updateOrderDto);
  }

  @Post(':id/devices')
  @ApiOperation({ summary: 'Add a device to an order' })
  @ApiResponse({ status: 201, description: 'Device added successfully' })
  @ApiResponse({ status: 400, description: 'Maximum allowed devices reached' })
  addDevice(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() addDeviceDto: AddDeviceDto,
  ) {
    return this.ordersService.addDevice(tenantId, id, addDeviceDto);
  }

  @Delete(':id/devices/:deviceId')
  @ApiOperation({ summary: 'Remove a device from an order' })
  @ApiResponse({ status: 200, description: 'Device removed successfully' })
  @ApiResponse({ status: 404, description: 'Device not found' })
  removeDevice(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.ordersService.removeDevice(tenantId, id, deviceId);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Add a payment to an order' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  addPayment(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() addPaymentDto: AddPaymentDto,
  ) {
    return this.ordersService.addPayment(tenantId, id, addPaymentDto);
  }
}
