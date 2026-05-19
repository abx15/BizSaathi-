export const maskPhone = (phone: string | null | undefined): string => {
  if (!phone) return 'N/A';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 4) return '****';
  return `${clean.slice(0, 2)}******${clean.slice(-4)}`;
};

export const logger = {
  info: (msg: string, meta?: any) => {
    const metaStr = meta ? ` | ${JSON.stringify(sanitizeMeta(meta))}` : '';
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}${metaStr}`);
  },
  warn: (msg: string, meta?: any) => {
    const metaStr = meta ? ` | ${JSON.stringify(sanitizeMeta(meta))}` : '';
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}${metaStr}`);
  },
  error: (msg: string, error?: any, meta?: any) => {
    const errorMsg = error ? ` | Error: ${error.message || error}` : '';
    const stack = error?.stack ? `\nStack: ${error.stack}` : '';
    const metaStr = meta ? ` | ${JSON.stringify(sanitizeMeta(meta))}` : '';
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}${errorMsg}${metaStr}${stack}`);
  },
};

const sanitizeMeta = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (key.toLowerCase().includes('phone') || key.toLowerCase().includes('mobile') || key === 'to' || key === 'from') {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = maskPhone(sanitized[key]);
      }
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeMeta(sanitized[key]);
    }
  }
  return sanitized;
};
