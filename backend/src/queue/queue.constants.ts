// Queue names — one queue per domain
export const QUEUES = {
  PDF:          'pdf',
  EMAIL:        'email',
  WHATSAPP:     'whatsapp',
  NOTIFICATION: 'notification',
  INVOICE:      'invoice',
  PAYROLL:      'payroll',
  AI:           'ai',
  CLEANUP:      'cleanup',
} as const;

// Job names within each queue
export const JOBS = {
  // PDF queue
  PDF_INVOICE:        'pdf:invoice:generate',
  PDF_SALARY_SLIP:    'pdf:salary-slip:generate',
  PDF_REPORT:         'pdf:report:generate',

  // Email queue
  EMAIL_INVOICE:      'email:invoice:send',
  EMAIL_OTP:          'email:otp:send',
  EMAIL_REPORT:       'email:report:send',
  EMAIL_WELCOME:      'email:welcome:send',
  EMAIL_PAYSLIP:      'email:payslip:send',

  // WhatsApp queue
  WA_INVOICE:         'whatsapp:invoice:send',
  WA_REMINDER:        'whatsapp:reminder:send',
  WA_OTP:             'whatsapp:otp:send',
  WA_SALARY_SLIP:     'whatsapp:salary-slip:send',
  WA_FOLLOWUP:        'whatsapp:followup:reminder',
  WA_BULK_REMINDER:   'whatsapp:bulk:reminder',

  // Notification queue
  NOTIFY_REALTIME:    'notification:realtime:push',
  NOTIFY_DASHBOARD:   'notification:dashboard:refresh',

  // Invoice queue
  INV_OVERDUE_CHECK:  'invoice:overdue:check',
  INV_REMINDER_SEND:  'invoice:reminder:auto-send',
  INV_RECURRING:      'invoice:recurring:generate',

  // Payroll queue
  PAY_PROCESS:        'payroll:process',
  PAY_SLIP_BULK:      'payroll:slip:bulk-generate',

  // AI queue
  AI_INDEX_ENTITY:    'ai:index:entity',
  AI_INDEX_TENANT:    'ai:index:tenant:full',
  AI_INSIGHT_GEN:     'ai:insight:generate',
  AI_CACHE_WARM:      'ai:cache:warm',

  // Cleanup queue
  CLEANUP_TEMP_FILES: 'cleanup:files:temporary',
  CLEANUP_EXPIRED_OTP:'cleanup:otp:expired',
  CLEANUP_OLD_LOGS:   'cleanup:logs:old',
  CLEANUP_WA_MSGS:    'cleanup:whatsapp:old-messages',
} as const;
