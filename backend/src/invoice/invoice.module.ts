import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { GstService } from './gst.service';
import { InvoiceNumberService } from './invoice-number.service';
import { PdfService } from './pdf.service';
import { CustomerModule } from '../customer/customer.module';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [CustomerModule, ProductModule],
  controllers: [InvoiceController],
  providers: [InvoiceService, GstService, InvoiceNumberService, PdfService],
  exports: [InvoiceService, GstService, PdfService],
})
export class InvoiceModule {}
