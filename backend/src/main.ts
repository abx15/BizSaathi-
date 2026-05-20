import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { LoggerService } from './logger/logger.service';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.request && event.request.data) {
      try {
        const body = typeof event.request.data === 'string' ? JSON.parse(event.request.data) : event.request.data;
        const sensitiveKeys = ['otp', 'password', 'phone', 'phoneNumber', 'bankAccount', 'accountNumber', 'routingNumber', 'cvv', 'cardNumber'];
        const scrub = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          for (const key in obj) {
            if (sensitiveKeys.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
              obj[key] = '[SCRUBBED]';
            } else if (typeof obj[key] === 'object') {
              scrub(obj[key]);
            }
          }
        };
        scrub(body);
        event.request.data = typeof event.request.data === 'string' ? JSON.stringify(body) : body;
      } catch {
        // Leave request data unchanged if JSON parsing fails
      }
    }
    return event;
  },
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = await app.resolve(LoggerService);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 3001;
  const apiPrefix = configService.get<string>('apiPrefix') || 'v1';
  const corsOrigins = configService.get<string[]>('cors.origins') || [];

  // Security & CORS
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global prefixes and versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiPrefix.replace('v', ''),
  });

  // Global Pipes, Filters, Interceptors, Guards
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter(logger));
  app.useGlobalInterceptors(new LoggingInterceptor(logger), new TransformInterceptor());
  
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('BizSaathi API')
    .setDescription('The BizSaathi Core API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}/api/${apiPrefix}`);
  logger.log(`Swagger docs at: ${await app.getUrl()}/api/docs`);
}

bootstrap();
