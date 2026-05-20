import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import configuration from './common/config/configuration';
import { LoggerModule } from './logger/logger.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { ProductModule } from './product/product.module';
import { InvoiceModule } from './invoice/invoice.module';
import { StorageModule } from './storage/storage.module';
import { UploadModule } from './upload/upload.module';
import { CategoryModule } from './category/category.module';
import { ExpenseModule } from './expense/expense.module';
import { StaffModule } from './staff/staff.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { PayrollModule } from './payroll/payroll.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { EventsModule } from './events/events.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('throttle.ttl')!,
          limit: config.get('throttle.limit')!,
        },
      ],
    }),
    LoggerModule,
    DatabaseModule,
    RedisModule,
    AuthModule,
    CustomerModule,
    ProductModule,
    InvoiceModule,
    StorageModule,
    UploadModule,
    CategoryModule,
    ExpenseModule,
    StaffModule,
    AttendanceModule,
    LeaveModule,
    PayrollModule,
    WhatsAppModule,
    EventsModule,
    QueueModule,
    HealthModule,
    MetricsModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
