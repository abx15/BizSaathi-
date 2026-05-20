import { get } from './client';
import { ApiResponse } from './types';

// Invoice dashboard summary
export const getDashboardSummary = () =>
  get<ApiResponse<DashboardSummary>>('/invoices/dashboard');

// Expense analytics this month
export const getExpenseAnalytics = (from: string, to: string) =>
  get<ApiResponse<ExpenseAnalytics>>(`/expenses/analytics?from=${from}&to=${to}`);

// P&L this month
export const getProfitLoss = (month: string) =>
  get<ApiResponse<ProfitLoss>>(`/expenses/analytics/profit-loss?month=${month}`);

// Cash flow last 6 months
export const getCashFlow = () =>
  get<ApiResponse<CashFlow>>('/expenses/analytics/cash-flow?months=6');

// AI dashboard summary (from AI service via Kong)
export const getAISummary = () =>
  get<ApiResponse<AISummary>>('/ai/dashboard-summary');

// AI insights
export const getAIInsights = () =>
  get<ApiResponse<AIInsights>>('/ai/insights');

// Types
export interface DashboardSummary {
  thisMonth: {
    revenue: number;
    invoiceCount: number;
    paidCount: number;
    pendingAmount: number;
  };
  overdue: { count: number; amount: number };
  recentInvoices: RecentInvoice[];
  topCustomers: TopCustomer[];
}

export interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  invoiceDate: string;
  dueDate: string;
}

export interface TopCustomer {
  customerId: string;
  name: string;
  totalRevenue: number;
  invoiceCount: number;
}

export interface ExpenseAnalytics {
  summary: {
    totalExpenses: number;
    totalGst: number;
    expenseCount: number;
    avgExpense: number;
  };
  byCategory: CategoryExpense[];
  byMonth: MonthlyExpense[];
  trend: { vsLastPeriod: number; direction: 'up' | 'down' | 'same' };
}

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyExpense {
  month: string;
  amount: number;
  count: number;
}

export interface ProfitLoss {
  period: string;
  revenue: { invoiced: number; received: number; pending: number };
  expenses: { total: number; byCategory: CategoryExpense[] };
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
}

export interface CashFlow {
  months: { month: string; inflow: number; outflow: number; net: number }[];
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
}

export interface AISummary {
  summary: string;
  mood: 'positive' | 'neutral' | 'warning';
}

export interface AIInsights {
  generatedAt: string;
  period: string;
  insights: AIInsight[];
}

export interface AIInsight {
  type: 'warning' | 'positive' | 'tip';
  title: string;
  body: string;
  actionLabel: string | null;
  actionUrl: string | null;
}
