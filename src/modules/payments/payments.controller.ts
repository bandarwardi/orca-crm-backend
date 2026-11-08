import { Controller, Post, Body, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { SearchPaymentsDto } from './dto/search-payments.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { TenantId } from '../../common/decorators/tenant-id.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('search')
  @ApiOperation({ summary: 'Search payments globally (e.g. for supervisors)' })
  @ApiResponse({ status: 200, description: 'List of matching payments' })
  search(@TenantId() tenantId: string, @Body() searchDto: SearchPaymentsDto) {
    return this.paymentsService.search(tenantId, searchDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(tenantId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update payment status independently' })
  @ApiResponse({ status: 200, description: 'Payment status updated' })
  updateStatus(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updateStatus(tenantId, id, updateDto);
  }
}
