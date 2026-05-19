import assert from 'assert';
import crypto from 'crypto';
import { verifySignature } from '../src/webhook/webhook.handler';
import { botService } from '../src/bot/bot.service';
import { BotSession } from '../src/bot/session.service';
import { IncomingMessage } from '../src/webhook/types';
import { TemplateService } from '../../src/whatsapp/template.service';

/**
 * 1. HMAC Signature Verification Tests
 */
function testHmacVerification() {
  console.log('Testing HMAC Signature Verification...');
  const appSecret = 'my_super_secret_app_secret_12345';
  const rawBody = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: []
  });

  // Compute valid signature
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  const validHeader = `sha256=${expectedSignature}`;

  // Test with correct signature
  const resultValid = verifySignature(rawBody, validHeader, appSecret);
  assert.strictEqual(resultValid, true, 'Should verify correct HMAC signature');

  // Test with invalid signature
  const resultInvalid = verifySignature(rawBody, 'sha256=invalid_sig', appSecret);
  assert.strictEqual(resultInvalid, false, 'Should reject invalid HMAC signature');

  // Test with empty signature
  const resultEmpty = verifySignature(rawBody, '', appSecret);
  assert.strictEqual(resultEmpty, false, 'Should reject empty signature');

  console.log('✅ HMAC Signature Verification Tests Passed');
}

/**
 * 2. Intent Parser Tests
 */
function testIntentParser() {
  console.log('Testing Intent Parser...');

  const mockSessionIdle: BotSession = {
    phone: '919876543210',
    tenantId: 'tenant-123',
    role: 'user',
    state: 'idle',
    context: {},
    lastMessageAt: new Date().toISOString()
  };

  const mockSessionWaitingInvoice: BotSession = {
    ...mockSessionIdle,
    state: 'waiting_invoice_selection'
  };

  const mockMessage = (text: string, type: 'text' | 'interactive' = 'text'): IncomingMessage => ({
    id: 'msg-123',
    from: '919876543210',
    senderName: 'Arun',
    timestamp: '1716160000',
    type,
    businessPhoneNumberId: 'phone-id-123',
    ...(type === 'text' ? { text } : { interactive: { type: 'button_reply', id: 'btn-1', title: text } })
  });

  const parser = (botService as any).parseIntent.bind(botService);

  // Test exact and Hinglish matches under idle state
  assert.strictEqual(parser(mockMessage('help'), mockSessionIdle), 'HELP');
  assert.strictEqual(parser(mockMessage('madad'), mockSessionIdle), 'HELP');
  assert.strictEqual(parser(mockMessage('namaste'), mockSessionIdle), 'HELP');

  assert.strictEqual(parser(mockMessage('invoice'), mockSessionIdle), 'INVOICE_LIST');
  assert.strictEqual(parser(mockMessage('bill'), mockSessionIdle), 'INVOICE_LIST');
  assert.strictEqual(parser(mockMessage('raseed'), mockSessionIdle), 'INVOICE_LIST');

  assert.strictEqual(parser(mockMessage('balance'), mockSessionIdle), 'BALANCE_CHECK');
  assert.strictEqual(parser(mockMessage('baaki'), mockSessionIdle), 'BALANCE_CHECK');
  assert.strictEqual(parser(mockMessage('kitna pending hai?'), mockSessionIdle), 'BALANCE_CHECK');

  assert.strictEqual(parser(mockMessage('report'), mockSessionIdle), 'REPORT');
  assert.strictEqual(parser(mockMessage('summary'), mockSessionIdle), 'REPORT');
  assert.strictEqual(parser(mockMessage('hisaab'), mockSessionIdle), 'REPORT');

  assert.strictEqual(parser(mockMessage('staff'), mockSessionIdle), 'STAFF_SUMMARY');
  assert.strictEqual(parser(mockMessage('kaamgaar'), mockSessionIdle), 'STAFF_SUMMARY');

  assert.strictEqual(parser(mockMessage('kharcha'), mockSessionIdle), 'EXPENSE_SUMMARY');
  assert.strictEqual(parser(mockMessage('expense'), mockSessionIdle), 'EXPENSE_SUMMARY');

  // Test interactive buttons routing
  assert.strictEqual(parser(mockMessage('INV-001', 'interactive'), mockSessionIdle), 'INTERACTIVE_REPLY');

  // Test unknown fallback under idle state
  assert.strictEqual(parser(mockMessage('random message'), mockSessionIdle), 'UNKNOWN');

  // Test waiting state overrides
  assert.strictEqual(parser(mockMessage('INV-002'), mockSessionWaitingInvoice), 'INTERACTIVE_REPLY');

  console.log('✅ Intent Parser Tests Passed');
}

/**
 * 3. Template Builders Tests
 */
function testTemplateBuilders() {
  console.log('Testing WhatsApp Template Builders...');
  const templateService = new TemplateService();

  // Test Template 1: invoice_sent
  const t1 = templateService.buildInvoiceSentTemplate({
    customerName: 'Ramesh Traders',
    invoiceNumber: 'INV-2025-001',
    amount: '₹15,000',
    dueDate: '15 Feb 2025',
    pdfUrl: 'https://files.bizsaathi.in/invoices/1.pdf'
  });
  assert.strictEqual(t1.name, 'bizsaathi_invoice_sent');
  assert.strictEqual(t1.components.length, 2);
  assert.strictEqual(t1.components[0].type, 'header');
  assert.strictEqual(t1.components[0].parameters[0].document?.link, 'https://files.bizsaathi.in/invoices/1.pdf');
  assert.strictEqual(t1.components[1].type, 'body');
  assert.strictEqual(t1.components[1].parameters[0].text, 'Ramesh Traders');

  // Test Template 2: payment_reminder
  const t2 = templateService.buildPaymentReminderTemplate({
    customerName: 'Sharma & Co',
    invoiceNumber: 'INV-2025-002',
    amount: '₹8,500',
    daysPending: 15
  });
  assert.strictEqual(t2.name, 'bizsaathi_payment_reminder');
  assert.strictEqual(t2.components[0].parameters[3].text, '15');

  // Test Template 3: payment_received
  const t3 = templateService.buildPaymentReceivedTemplate({
    customerName: 'Ramesh Traders',
    invoiceNumber: 'INV-2025-001',
    amount: '₹15,000',
    remainingBalance: '₹0'
  });
  assert.strictEqual(t3.name, 'bizsaathi_payment_received');
  assert.strictEqual(t3.components[0].parameters[2].text, '₹15,000');

  // Test Template 4: otp_verification
  const t4 = templateService.buildOTPTemplate({
    otp: '123456',
    expiryMinutes: 10
  });
  assert.strictEqual(t4.name, 'bizsaathi_otp');
  assert.strictEqual(t4.components[0].parameters[0].text, '123456');

  // Test Template 5: salary_slip_sent
  const t5 = templateService.buildSalarySlipTemplate({
    staffName: 'Kamlesh Kumar',
    month: 'Jan-2025',
    netSalary: '₹22,500',
    pdfUrl: 'https://files.bizsaathi.in/payroll/slip.pdf'
  });
  assert.strictEqual(t5.name, 'bizsaathi_salary_slip');
  assert.strictEqual(t5.components[0].parameters[0].document?.filename, 'SalarySlip_Jan_2025.pdf');

  // Test Template 6: followup_reminder
  const t6 = templateService.buildFollowupReminderTemplate({
    leadTitle: 'CRM System Integration',
    contactName: 'Rohan Sharma',
    dueTime: '3:00 PM'
  });
  assert.strictEqual(t6.name, 'bizsaathi_followup_reminder');
  assert.strictEqual(t6.components[0].parameters[0].text, 'CRM System Integration');

  console.log('✅ Template Builders Tests Passed');
}

/**
 * Run all unit tests
 */
function runAll() {
  console.log('=================== Running BizSaathi Phase 7 Unit Tests ===================');
  try {
    testHmacVerification();
    testIntentParser();
    testTemplateBuilders();
    console.log('=================== All Unit Tests Passed Successfully! ===================');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Test execution failed with error:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
}

runAll();
