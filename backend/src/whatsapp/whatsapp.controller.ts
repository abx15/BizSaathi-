import { Controller, Post, Get, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { SendInvoiceDto } from './dto/send-invoice.dto';
import { BulkReminderDto } from './dto/bulk-reminder.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SendSalarySlipDto } from './dto/send-salary-slip.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MsgStatus } from '@prisma/client';

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('send/invoice')
  @HttpCode(HttpStatus.OK)
  async sendInvoice(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendInvoiceDto,
  ) {
    return this.whatsappService.sendInvoice(
      user.tenantId,
      dto.invoiceId,
      dto.phone,
      dto.includesPdf,
    );
  }

  @Post('send/reminder')
  @HttpCode(HttpStatus.OK)
  async sendReminder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { invoiceId: string; customMessage?: string },
  ) {
    return this.whatsappService.sendReminder(
      user.tenantId,
      dto.invoiceId,
      dto.customMessage,
    );
  }

  @Post('send/bulk-reminders')
  @HttpCode(HttpStatus.OK)
  async sendBulkReminders(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BulkReminderDto,
  ) {
    return this.whatsappService.sendBulkReminders(
      user.tenantId,
      dto.invoiceIds,
      dto.daysOverdue,
    );
  }

  @Post('send/salary-slip')
  @HttpCode(HttpStatus.OK)
  async sendSalarySlip(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendSalarySlipDto,
  ) {
    return this.whatsappService.sendSalarySlip(
      user.tenantId,
      dto.payrollId,
    );
  }

  @Post('send/text')
  @HttpCode(HttpStatus.OK)
  async sendDirectText(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendMessageDto,
  ) {
    return this.whatsappService.sendDirectText(
      user.tenantId,
      dto.phone,
      dto.message,
    );
  }

  @Get('messages')
  async getMessages(
    @CurrentUser() user: JwtPayload,
    @Query('phone') phone?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: MsgStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.whatsappService.getMessages(
      user.tenantId,
      phone,
      entityId,
      status,
      pageNum,
      limitNum,
    );
  }

  @Get('messages/stats')
  async getMessageStats(@CurrentUser() user: JwtPayload) {
    return this.whatsappService.getMessageStats(user.tenantId);
  }
}
