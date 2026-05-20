'use client';

import React, { useState, useEffect } from 'react';
import { InvoiceFilterParams } from '@/lib/api/invoices';
import { CustomerSelect } from './customer-select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  Search, 
  X, 
  Calendar, 
  Filter, 
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InvoiceFiltersProps {
  filters: InvoiceFilterParams;
  onChange: (filters: InvoiceFilterParams) => void;
}

const STATUS_OPTIONS = [
  { id: 'ALL', label: 'All Bills' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'SENT', label: 'Sent' },
  { id: 'PAID', label: 'Paid' },
  { id: 'OVERDUE', label: 'Overdue' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export function InvoiceFilters({ filters, onChange }: InvoiceFiltersProps) {
  const [search, setSearch] = useState(filters.search || '');
  const [showAdvance, setShowAdvance] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Sync debounced search to filters state
  useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      onChange({ ...filters, search: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch]);

  // Sync local search when filters reset from outside
  useEffect(() => {
    setSearch(filters.search || '');
  }, [filters.search]);

  const handleStatusChange = (status: string) => {
    const updatedStatus = status === 'ALL' ? undefined : status;
    onChange({ ...filters, status: updatedStatus, page: 1 });
  };

  const handleCustomerChange = (customerId: string) => {
    onChange({ ...filters, customerId: customerId || undefined, page: 1 });
  };

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    onChange({ ...filters, [type]: value || undefined, page: 1 });
  };

  const handleClear = () => {
    setSearch('');
    onChange({
      page: 1,
      limit: filters.limit,
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, val]) => {
    if (key === 'page' || key === 'limit') return false;
    return val !== undefined && val !== '';
  }).length;

  return (
    <div className="space-y-4 bg-card border rounded-2xl p-5 shadow-sm">
      {/* Top Search & Status Tabs Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none -mx-5 px-5 md:mx-0 md:px-0">
          {STATUS_OPTIONS.map((opt) => {
            const isSelected = (!filters.status && opt.id === 'ALL') || filters.status === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleStatusChange(opt.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full font-bold text-xs uppercase tracking-wide transition-all whitespace-nowrap border shrink-0",
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                    : "bg-transparent border-border/60 text-muted-foreground hover:border-slate-500/40 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Search Field & Advance Toggle */}
        <div className="flex items-center gap-2 md:w-80 shrink-0">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search invoice number, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-xs pl-9 pr-7 border-border/60 bg-transparent font-semibold w-full"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvance(!showAdvance)}
            className={cn(
              "h-9 px-3 text-xs font-bold uppercase shrink-0 border-border/60",
              showAdvance && "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5 mr-1" /> Filters
            {activeFilterCount > (filters.search ? 1 : 0) && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-indigo-600 text-white font-extrabold">
                {activeFilterCount - (filters.search ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Expandable Advanced Filters Drawer */}
      {showAdvance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-border/40 bg-muted/10 animate-slideDown">
          {/* Customer filter */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <CustomerSelect
              value={filters.customerId || ''}
              onChange={handleCustomerChange}
            />
          </div>

          {/* Date range from */}
          <div className="space-y-1.5">
            <Label htmlFor="date-from" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              From Date
            </Label>
            <div className="relative">
              <Input
                id="date-from"
                type="date"
                value={filters.from || ''}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="h-9 text-xs border-border/60 bg-transparent font-semibold pl-9"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Date range to */}
          <div className="space-y-1.5">
            <Label htmlFor="date-to" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              To Date
            </Label>
            <div className="relative">
              <Input
                id="date-to"
                type="date"
                value={filters.to || ''}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="h-9 text-xs border-border/60 bg-transparent font-semibold pl-9"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Clear Filters bar when active */}
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between border-t border-border/20 pt-3">
          <p className="text-[10px] text-muted-foreground font-semibold">
            Showing filtered invoices ({activeFilterCount} rule{activeFilterCount > 1 ? 's' : ''} applied)
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 px-2.5 rounded-full"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}
