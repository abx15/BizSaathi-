import { PrismaClient, UserRole, InvoiceStatus, PaymentMethod, EmploymentType, StaffStatus, SalaryType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding database...');

  // 1. Create Tenant
  console.log('Seeding Tenant...');
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'BizSaathi Demo Store',
      slug: 'demo',
      gstNumber: '07AAAAA1111A1Z1',
      address: 'Shop No. 12, Main Market, Lajpat Nagar, New Delhi - 110024',
      phone: '+919999999999',
      isActive: true,
    },
  });
  console.log(`Tenant created: ${tenant.name} (${tenant.id})`);

  // 2. Create Owner User
  console.log('Seeding Owner User...');
  const owner = await prisma.user.upsert({
    where: { phone: '+919999999999' },
    update: {
      name: 'Arun Kumar',
      email: 'arun@bizsaathi.in',
      role: UserRole.OWNER,
    },
    create: {
      tenantId: tenant.id,
      phone: '+919999999999',
      name: 'Arun Kumar',
      email: 'arun@bizsaathi.in',
      role: UserRole.OWNER,
      isActive: true,
    },
  });
  console.log(`Owner User created: ${owner.name} (${owner.id})`);

  // 3. Create Default Expense Categories
  console.log('Seeding Expense Categories...');
  const defaultCategories = [
    { name: 'Office Supplies', icon: '📎', color: '#3B82F6' },
    { name: 'Rent', icon: '🏢', color: '#10B981' },
    { name: 'Utilities', icon: '⚡', color: '#F59E0B' },
    { name: 'Travel', icon: '✈️', color: '#6366F1' },
    { name: 'Meals & Entertainment', icon: '🍽️', color: '#EC4899' },
    { name: 'Marketing', icon: '📢', color: '#8B5CF6' },
    { name: 'Software/SaaS', icon: '💻', color: '#14B8A6' },
    { name: 'Legal & Professional Fees', icon: '⚖️', color: '#64748B' },
    { name: 'Repairs & Maintenance', icon: '🔧', color: '#F97316' },
    { name: 'Taxes & Licenses', icon: '📜', color: '#EF4444' },
  ];

  const categories = [];
  for (const cat of defaultCategories) {
    const dbCat = await prisma.expenseCategory.create({
      data: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isDefault: true,
        tenantId: null,
        isActive: true,
      },
    });
    categories.push(dbCat);
  }
  console.log(`Seeded ${categories.length} Expense Categories.`);

  // 4. Create Customers
  console.log('Seeding Customers...');
  const sharmaStore = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Sharma Kirana Store',
      phone: '+919876543210',
      email: 'sharma@kirana.com',
      gstin: '07BBBBB2222B2Z2',
      address: 'Block C, Kirti Nagar',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110015',
    },
  });

  const vermaElectronics = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Verma Electronics',
      phone: '+919876543211',
      email: 'verma@electronics.com',
      address: 'Sector 62, Near Metro Station',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
    },
  });
  console.log('Customers seeded successfully.');

  // 5. Create Products
  console.log('Seeding Products...');
  const rice = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: 'Basmati Rice 10kg',
      description: 'Premium long-grain basmati rice',
      hsnCode: '10063010',
      unit: 'bags',
      price: 1200.00,
      gstRate: 5.00,
    },
  });

  const oil = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: 'Refined Oil 5L',
      description: 'Healthy cooking sunflower oil',
      hsnCode: '15121910',
      unit: 'cans',
      price: 750.00,
      gstRate: 12.00,
    },
  });

  const salt = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name: 'Tata Salt 1kg',
      description: 'Iodized table salt',
      hsnCode: '25010021',
      unit: 'pcs',
      price: 28.00,
      gstRate: 0.00,
    },
  });
  console.log('Products seeded successfully.');

  // 6. Create Invoices
  console.log('Seeding Invoices...');
  
  // Paid Invoice for Sharma Kirana Store
  const invoice1 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceNumber: 'INV-2026-001',
      customerId: sharmaStore.id,
      invoiceDate: new Date('2026-05-01'),
      dueDate: new Date('2026-05-15'),
      status: InvoiceStatus.PAID,
      subtotal: 3178.00,
      totalCgst: 62.50,
      totalSgst: 62.50,
      totalIgst: 0.00,
      totalAmount: 3303.00,
      paidAmount: 3303.00,
      notes: 'Thank you for your business!',
      isGstInvoice: true,
      placeOfSupply: 'Delhi',
      items: {
        create: [
          {
            productId: rice.id,
            name: 'Basmati Rice 10kg',
            hsnCode: '10063010',
            quantity: 2,
            unit: 'bags',
            rate: 1200.00,
            discount: 0,
            gstRate: 5.00,
            cgst: 60.00,
            sgst: 60.00,
            igst: 0.00,
            amount: 2520.00, // (1200 * 2) * 1.05 = 2520
          },
          {
            productId: salt.id,
            name: 'Tata Salt 1kg',
            hsnCode: '25010021',
            quantity: 25,
            unit: 'pcs',
            rate: 28.00,
            discount: 5.00, // 5% discount
            gstRate: 0.00,
            cgst: 0.00,
            sgst: 0.00,
            igst: 0.00,
            amount: 665.00, // (28 * 25) * 0.95 = 665
          }
        ]
      },
      payments: {
        create: {
          tenantId: tenant.id,
          amount: 3303.00,
          method: PaymentMethod.UPI,
          reference: 'UPI1234567890',
          note: 'Full payment received',
          paidAt: new Date('2026-05-02'),
        }
      }
    }
  });

  // Partial Invoice for Verma Electronics (IGST since UP)
  const invoice2 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceNumber: 'INV-2026-002',
      customerId: vermaElectronics.id,
      invoiceDate: new Date('2026-05-10'),
      dueDate: new Date('2026-06-10'),
      status: InvoiceStatus.PARTIAL,
      subtotal: 4500.00,
      totalCgst: 0.00,
      totalSgst: 0.00,
      totalIgst: 540.00, // 12% IGST
      totalAmount: 5040.00,
      paidAmount: 2000.00,
      notes: '50% advance requested',
      isGstInvoice: true,
      placeOfSupply: 'Uttar Pradesh',
      items: {
        create: [
          {
            productId: oil.id,
            name: 'Refined Oil 5L',
            hsnCode: '15121910',
            quantity: 6,
            unit: 'cans',
            rate: 750.00,
            discount: 0,
            gstRate: 12.00,
            cgst: 0.00,
            sgst: 0.00,
            igst: 540.00,
            amount: 5040.00,
          }
        ]
      },
      payments: {
        create: {
          tenantId: tenant.id,
          amount: 2000.00,
          method: PaymentMethod.BANK_TRANSFER,
          reference: 'TXN987654321',
          note: 'Advance payment',
          paidAt: new Date('2026-05-11'),
        }
      }
    }
  });

  // Draft Invoice
  const invoice3 = await prisma.invoice.create({
    data: {
      tenantId: tenant.id,
      invoiceNumber: 'INV-2026-003',
      customerId: sharmaStore.id,
      invoiceDate: new Date('2026-05-19'),
      status: InvoiceStatus.DRAFT,
      subtotal: 1200.00,
      totalCgst: 30.00,
      totalSgst: 30.00,
      totalAmount: 1260.00,
      paidAmount: 0.00,
      isGstInvoice: true,
      placeOfSupply: 'Delhi',
      items: {
        create: [
          {
            productId: rice.id,
            name: 'Basmati Rice 10kg',
            hsnCode: '10063010',
            quantity: 1,
            unit: 'bags',
            rate: 1200.00,
            discount: 0,
            gstRate: 5.00,
            cgst: 30.00,
            sgst: 30.00,
            amount: 1260.00,
          }
        ]
      }
    }
  });

  console.log('Invoices and payments seeded successfully.');

  // 7. Create Expenses
  console.log('Seeding Expenses...');
  const rentCategory = categories.find(c => c.name === 'Rent');
  const softwareCategory = categories.find(c => c.name === 'Software/SaaS');

  if (rentCategory) {
    await prisma.expense.create({
      data: {
        tenantId: tenant.id,
        categoryId: rentCategory.id,
        title: 'Office Rent May 2026',
        amount: 15000.00,
        gstAmount: 2700.00, // 18% GST
        totalAmount: 17700.00,
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        vendor: 'DLF Properties',
        reference: 'RENTMAY26',
        expenseDate: new Date('2026-05-01'),
        createdBy: owner.id,
      }
    });
  }

  if (softwareCategory) {
    await prisma.expense.create({
      data: {
        tenantId: tenant.id,
        categoryId: softwareCategory.id,
        title: 'BizSaathi Subscription',
        amount: 999.00,
        gstAmount: 179.82,
        totalAmount: 1178.82,
        paymentMethod: PaymentMethod.UPI,
        vendor: 'BizSaathi Technologies',
        expenseDate: new Date('2026-05-15'),
        createdBy: owner.id,
      }
    });
  }
  console.log('Expenses seeded successfully.');

  // 8. Create Staff
  console.log('Seeding Staff...');
  const staff1 = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      employeeCode: 'EMP-001',
      name: 'Rohan Gupta',
      phone: '+919876543220',
      email: 'rohan@bizsaathi.in',
      role: 'Sales Manager',
      department: 'Sales',
      joiningDate: new Date('2025-01-15'),
      employmentType: EmploymentType.FULL_TIME,
      status: StaffStatus.ACTIVE,
      salaryType: SalaryType.MONTHLY,
      basicSalary: 25000.00,
      hra: 5000.00,
      allowances: 2000.00,
      pfEnabled: true,
      esicEnabled: true,
      bankName: 'HDFC Bank',
      accountNumber: '50100234567890',
      ifscCode: 'HDFC0000123',
    }
  });

  const staff2 = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      employeeCode: 'EMP-002',
      name: 'Amit Singh',
      phone: '+919876543221',
      role: 'Delivery Executive',
      department: 'Logistics',
      joiningDate: new Date('2025-03-01'),
      employmentType: EmploymentType.FULL_TIME,
      status: StaffStatus.ACTIVE,
      salaryType: SalaryType.MONTHLY,
      basicSalary: 15000.00,
      hra: 2000.00,
      allowances: 1500.00,
      bankName: 'State Bank of India',
      accountNumber: '30456789012',
      ifscCode: 'SBIN0001234',
    }
  });
  console.log('Staff seeded successfully.');

  // 9. Create WhatsApp Templates & Session
  console.log('Seeding WhatsApp configs...');
  await prisma.whatsAppTemplate.create({
    data: {
      name: 'bizsaathi_otp',
      language: 'en',
      category: 'AUTHENTICATION',
      components: [
        {
          type: 'BODY',
          text: 'Your BizSaathi OTP verification code is {{1}}. Valid for 10 minutes.',
        },
        {
          type: 'BUTTONS',
          buttons: [
            {
              type: 'OTP',
              text: 'Copy Code',
            }
          ]
        }
      ],
      isActive: true,
    }
  });
  console.log('WhatsApp templates seeded.');

  console.log('Database seeding successfully completed! All systems ready.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
