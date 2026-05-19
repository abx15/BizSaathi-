import { Controller, Get, Post, Body, Put, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('invoices')
  @ApiOperation({ summary: 'Create a new invoice' })
  create(@CurrentUser('tenantId') tenantId: string, @Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoiceService.create(tenantId, createInvoiceDto);
  }

  @Get('invoices/dashboard')
  @ApiOperation({ summary: 'Get invoice dashboard metrics' })
  getDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.invoiceService.getDashboard(tenantId);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List and filter invoices' })
  findAll(@CurrentUser('tenantId') tenantId: string, @Query() filter: InvoiceFilterDto) {
    return this.invoiceService.findAll(tenantId, filter);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get specific invoice details' })
  findOne(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.invoiceService.findOne(tenantId, id);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Generate or get invoice PDF URL' })
  generatePdf(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.invoiceService.generatePdf(tenantId, id);
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Update a DRAFT invoice' })
  update(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(tenantId, id, updateInvoiceDto);
  }

  @Post('invoices/:id/send')
  @ApiOperation({ summary: 'Send an invoice (mark as SENT)' })
  send(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.invoiceService.send(tenantId, id);
  }

  @Post('invoices/:id/payments')
  @ApiOperation({ summary: 'Record a payment for an invoice' })
  addPayment(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() addPaymentDto: AddPaymentDto,
  ) {
    return this.invoiceService.addPayment(tenantId, id, addPaymentDto);
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Delete a DRAFT invoice' })
  remove(@CurrentUser('tenantId') tenantId: string, @Param('id') id: string) {
    return this.invoiceService.remove(tenantId, id);
  }

  // GST Endpoints
  @Get('gst/summary')
  @ApiOperation({ summary: 'Get GST Summary for a month (YYYY-MM)' })
  getGstSummary(@CurrentUser('tenantId') tenantId: string, @Query('month') month: string) {
    return this.invoiceService.getGstSummary(tenantId, month);
  }

  @Get('gst/gstr1')
  @ApiOperation({ summary: 'Get GSTR-1 data for a month (YYYY-MM)' })
  getGstr1(@CurrentUser('tenantId') tenantId: string, @Query('month') month: string) {
    return this.invoiceService.getGstr1(tenantId, month);
  }
}
