import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { MetaApiService } from './meta-api.service';
import { TemplateService } from './template.service';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [InvoiceModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, MetaApiService, TemplateService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
