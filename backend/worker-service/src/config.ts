import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  dbUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/bizsaathi',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  resend: {
    apiKey: process.env.RESEND_API_KEY || 're_mock_key',
    from: process.env.RESEND_FROM || 'BizSaathi <no-reply@bizsaathi.in>',
  },

  whatsapp: {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || 'mock_token',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || 'mock_id',
  },

  r2: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || 'mock_r2_access_key',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || 'mock_r2_secret_key',
    bucketName: process.env.R2_BUCKET_NAME || 'bizsaathi-files',
    accountId: process.env.R2_ACCOUNT_ID || 'mock_r2_account_id',
    publicUrl: process.env.R2_PUBLIC_URL || 'https://files.bizsaathi.in',
  },

  concurrency: {
    pdf: parseInt(process.env.CONCURRENCY_PDF || '2', 10),
    email: parseInt(process.env.CONCURRENCY_EMAIL || '5', 10),
    whatsapp: parseInt(process.env.CONCURRENCY_WHATSAPP || '3', 10),
    notification: parseInt(process.env.CONCURRENCY_NOTIFICATION || '10', 10),
    invoice: parseInt(process.env.CONCURRENCY_INVOICE || '2', 10),
    payroll: parseInt(process.env.CONCURRENCY_PAYROLL || '2', 10),
    ai: parseInt(process.env.CONCURRENCY_AI || '1', 10),
    cleanup: parseInt(process.env.CONCURRENCY_CLEANUP || '1', 10),
  }
};
