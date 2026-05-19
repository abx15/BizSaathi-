import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

export interface Config {
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  WHATSAPP_ACCESS_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
  WHATSAPP_APP_SECRET: string;
  WHATSAPP_VERIFY_TOKEN: string;
  NESTJS_INTERNAL_URL: string;
  AI_SERVICE_URL: string;
}

const getEnvOrThrow = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Environment variable ${key} is required but missing`);
  }
  return val;
};

export const config: Config = {
  PORT: parseInt(process.env.PORT || '3007', 10),
  DATABASE_URL: getEnvOrThrow('DATABASE_URL'),
  REDIS_URL: getEnvOrThrow('REDIS_URL'),
  WHATSAPP_ACCESS_TOKEN: getEnvOrThrow('WHATSAPP_ACCESS_TOKEN'),
  WHATSAPP_PHONE_NUMBER_ID: getEnvOrThrow('WHATSAPP_PHONE_NUMBER_ID'),
  WHATSAPP_APP_SECRET: getEnvOrThrow('WHATSAPP_APP_SECRET'),
  WHATSAPP_VERIFY_TOKEN: getEnvOrThrow('WHATSAPP_VERIFY_TOKEN'),
  NESTJS_INTERNAL_URL: process.env.NESTJS_INTERNAL_URL || 'http://backend:3001',
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://ai-service:8000',
};
