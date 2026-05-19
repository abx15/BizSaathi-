import { ConsoleLogger, Injectable, Scope } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  private readonly winstonLogger: winston.Logger;

  constructor(context?: string) {
    super(context || 'App');

    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );

    const transport = new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    });

    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        transport,
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });
  }

  log(message: any, context?: string) {
    super.log(message, context);
    this.winstonLogger.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.winstonLogger.error(message, { trace, context: context || this.context });
  }

  warn(message: any, context?: string) {
    super.warn(message, context);
    this.winstonLogger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    super.debug(message, context);
    this.winstonLogger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    super.verbose(message, context);
    this.winstonLogger.verbose(message, { context: context || this.context });
  }
}
