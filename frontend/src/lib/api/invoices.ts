import { get, post, put, del } from './client';
import { ApiResponse } from './types';

// --- Invoices ---
export const getInvoices = (params: InvoiceFilterParams) =>
  get<ApiResponse<PaginatedInvoices>>(`/invoices?${new URLSearchParams(params as any)}`);

export const getInvoice = (id: string) =>
  get<ApiResponse<Invoice>>(`/invoices/${id}`);

export const createInvoice = (data: CreateInvoiceInput) =>
  post<ApiResponse<Invoice>>('/invoices', data);

export const updateInvoice = (id: string, data: Partial<CreateInvoiceInput>) =>
  put<ApiResponse<Invoice>>(`/invoices/${id}`, data);

export const deleteInvoice = (id: string) =>
  del<ApiResponse<void>>(`/invoices/${id}`);

export const sendInvoice = (id: string) =>
  post<ApiResponse<Invoice>>(`/invoices/${id}/send`);

export const getInvoicePdf = (id: string) =>
  get<ApiResponse<{ signedUrl: string }>>(`/invoices/${id}/pdf`);

export const addPayment = (id: string, data: AddPaymentInput) =>
  post<ApiResponse<Invoice>>(`/invoices/${id}/payments`, data);

export const sendInvoiceWhatsApp = (id: string, phone?: string) =>
  post<ApiResponse<{ success: boolean }>>(`/whatsapp/send/invoice`, { invoiceId: id, phone });

export const sendBulkReminders = (data: { daysOverdue?: number; invoiceIds?: string[] }) =>
  post<ApiResponse<{ success: boolean; count: number }>>('/whatsapp/send/bulk-reminders', data);

// --- Customers ---
export const getCustomers = (search?: string, page = 1) =>
  get<ApiResponse<PaginatedCustomers>>(`/customers?search=${search || ''}&page=${page}&limit=20`);

export const createCustomer = (data: CreateCustomerInput) =>
  post<ApiResponse<Customer>>('/customers', data);

// --- Products ---
export const getProducts = (search?: string) =>
  get<ApiResponse<PaginatedProducts>>(`/products?search=${search || ''}&limit=50`);

export const createProduct = (data: CreateProductInput) =>
  post<ApiResponse<Product>>('/products', data);

// --- GST ---
export const getGstSummary = (month: string) =>
  get<ApiResponse<GstSummary>>(`/gst/summary?month=${month}`);

// --- Types ---
export interface InvoiceFilterParams {
  status?: string;
  customerId?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: Customer;
  invoiceDate: string;
  dueDate: string | null;
  status: InvoiceStatus;
  subtotal: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalAmount: number;
  paidAmount: number;
  notes: string | null;
  termsConditions: string | null;
  isGstInvoice: boolean;
  placeOfSupply: string | null;
  pdfUrl: string | null;
  items: InvoiceItem[];
  payments: Payment[];
  createdAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  name: string;
  hsnCode: string | null;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  amount: number;
}

export interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  paidAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
}

export interface Product {
  id: string;
  name: string;
  hsnCode: string | null;
  unit: string;
  price: number;
  gstRate: number;
}

export interface CreateInvoiceInput {
  customerId: string;
  invoiceDate: string;
  dueDate?: string;
  isGstInvoice: boolean;
  placeOfSupply?: string;
  items: CreateInvoiceItem[];
  notes?: string;
  termsConditions?: string;
}

export interface CreateInvoiceItem {
  productId?: string;
  name: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount: number;
  gstRate: number;
}

export interface AddPaymentInput {
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paidAt: string;
}

export interface PaginatedInvoices {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: {
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueCount: number;
  };
}

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  gstin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface CreateProductInput {
  name: string;
  hsnCode?: string | null;
  unit: string;
  price: number;
  gstRate: number;
}

export interface GstSummary {
  month: string;
  totalTaxableValue: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalGst: number;
  byRate: {
    rate: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
  }[];
}
