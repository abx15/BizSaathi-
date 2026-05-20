'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Sparkles, Calendar, Receipt, FileText, HelpCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { CustomerSelect } from './customer-select';
import { InvoiceLineItems } from './invoice-line-items';
import { InvoiceGstSummary } from './invoice-gst-summary';
import { InvoiceTotals } from './invoice-totals';
import { CreateInvoiceInput, Invoice } from '@/lib/api/invoices';

const itemSchema = z.object({
  productId: z.string().optional(),
  name: z.string().min(1, 'Item ka naam anivary hai'),
  hsnCode: z.string().optional(),
  quantity: z.number().min(0.01, 'Qty 0.01 se zyada honi chahiye'),
  unit: z.string().default('PCS'),
  rate: z.number().min(0, 'Price 0 ya zyada hona chahiye'),
  discount: z.number().min(0).max(100).default(0),
  gstRate: z.number().default(18),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, 'Grahak chunna anivary hai'),
  invoiceDate: z.string().min(1, 'Invoice tareekh anivary hai'),
  dueDate: z.string().optional(),
  isGstInvoice: z.boolean().default(true),
  placeOfSupply: z.string().min(1, 'Place of supply anivary hai'),
  items: z.array(itemSchema).min(1, 'Kam se kam ek item hona chahiye'),
  notes: z.string().optional(),
  termsConditions: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceFormProps {
  initialData?: Invoice | null;
  onSubmit: (data: CreateInvoiceInput) => Promise<any>;
  isLoading?: boolean;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 
  'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
  'Ladakh', 'Lakshadweep', 'Puducherry'
];

export function InvoiceForm({ initialData, onSubmit, isLoading = false }: InvoiceFormProps) {
  const router = useRouter();
  
  // Format initialData if editing
  const defaultValues: Partial<InvoiceFormValues> = initialData
    ? {
        customerId: initialData.customerId,
        invoiceDate: new Date(initialData.invoiceDate).toISOString().split('T')[0],
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        isGstInvoice: initialData.isGstInvoice,
        placeOfSupply: initialData.placeOfSupply || 'Delhi',
        items: initialData.items.map((item) => ({
          productId: (item as any).productId || undefined,
          name: item.name,
          hsnCode: item.hsnCode || undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
          gstRate: item.gstRate,
        })),
        notes: initialData.notes || '',
        termsConditions: initialData.termsConditions || '',
      }
    : {
        customerId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        isGstInvoice: true,
        placeOfSupply: 'Delhi',
        items: [
          {
            productId: '',
            name: '',
            hsnCode: '',
            quantity: 1,
            unit: 'PCS',
            rate: 0,
            discount: 0,
            gstRate: 18,
          },
        ],
        notes: '',
        termsConditions: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. will be charged if payment is not made within due date.',
      };

  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors, isDirty },
  } = methods;

  const isGstInvoice = watch('isGstInvoice');

  const onFormSubmit = async (values: InvoiceFormValues) => {
    try {
      const payload: CreateInvoiceInput = {
        customerId: values.customerId,
        invoiceDate: values.invoiceDate,
        dueDate: values.dueDate || undefined,
        isGstInvoice: values.isGstInvoice,
        placeOfSupply: values.placeOfSupply || undefined,
        items: values.items.map((item) => ({
          productId: item.productId || undefined,
          name: item.name,
          hsnCode: item.hsnCode || undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          discount: item.discount,
          gstRate: item.gstRate,
        })),
        notes: values.notes || undefined,
        termsConditions: values.termsConditions || undefined,
      };
      
      await onSubmit(payload);
    } catch (err: any) {
      toast.error(err.message || 'Invoice save karne mein samasya aayi.');
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Top Sticky bar for Save/Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur z-20 gap-4">
          <div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-wide flex items-center">
              <Receipt className="h-5.5 w-5.5 text-indigo-500 mr-2" />
              {initialData ? `Edit Invoice (#${initialData.invoiceNumber})` : 'Naya Invoice Banao'}
            </h2>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Vyapar ke hisab se tax invoice taiyar karein
            </p>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (isDirty) {
                  if (confirm('Aapke pas bina save kiya data hai. Kya aap sach mein wapas jana chahte hain?')) {
                    router.back();
                  }
                } else {
                  router.back();
                }
              }}
              className="font-bold text-xs uppercase h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="font-bold text-xs uppercase bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 h-9"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin mr-1.5" />
                  Save Ho Raha...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Invoice Save Karo
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main Column (2/3 width on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Section */}
            <Card className="p-6 bg-card border border-border">
              <CustomerSelect
                value={watch('customerId')}
                onChange={(id, customer) => {
                  setValue('customerId', id, { shouldDirty: true, shouldValidate: true });
                  if (customer && customer.state) {
                    setValue('placeOfSupply', customer.state, { shouldDirty: true });
                  }
                }}
                error={errors.customerId?.message}
              />
            </Card>

            {/* Line Items Section */}
            <InvoiceLineItems />

            {/* Terms and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-5 bg-card border border-border space-y-2">
                <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                  <FileText className="h-3.5 w-3.5 text-indigo-400 mr-1.5" /> Special Notes (Bahi Khata Tippani)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Apne grahak ke liye koi sandesh ya notes likhein..."
                  rows={4}
                  {...register('notes')}
                  className="text-xs border-border/60 font-medium resize-none bg-transparent"
                />
              </Card>

              <Card className="p-5 bg-card border border-border space-y-2">
                <Label htmlFor="termsConditions" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center">
                  <HelpCircle className="h-3.5 w-3.5 text-indigo-400 mr-1.5" /> Terms & Conditions (Vyapar Niyam)
                </Label>
                <Textarea
                  id="termsConditions"
                  placeholder="Payment niyam aur shartein..."
                  rows={4}
                  {...register('termsConditions')}
                  className="text-xs border-border/60 font-medium resize-none bg-transparent"
                />
              </Card>
            </div>
          </div>

          {/* Right Column / Settings & Totals (1/3 width) */}
          <div className="space-y-6">
            {/* Invoice Settings Card */}
            <Card className="p-6 bg-card border border-border space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground border-b pb-2">
                Invoice Details (Tithi Aur Sthan)
              </h3>

              <div className="space-y-4">
                {/* Invoice Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="invoiceDate" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Invoice Date *
                  </Label>
                  <div className="relative">
                    <Input
                      id="invoiceDate"
                      type="date"
                      {...register('invoiceDate')}
                      className="h-10 text-xs border-border/60 bg-transparent font-semibold pl-9"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                  {errors.invoiceDate && (
                    <p className="text-[10px] font-bold text-destructive">{errors.invoiceDate.message}</p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Due Date (Optional)
                  </Label>
                  <div className="relative">
                    <Input
                      id="dueDate"
                      type="date"
                      {...register('dueDate')}
                      className="h-10 text-xs border-border/60 bg-transparent font-semibold pl-9"
                    />
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>

                {/* GST Toggle Switch */}
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/10 border-border/40">
                  <div className="space-y-0.5">
                    <Label htmlFor="isGstInvoice" className="text-xs font-black uppercase text-foreground">
                      GST Tax Invoice
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Calculates CGST/SGST/IGST automatically
                    </p>
                  </div>
                  <Switch
                    id="isGstInvoice"
                    checked={isGstInvoice}
                    onCheckedChange={(checked) => setValue('isGstInvoice', checked, { shouldDirty: true })}
                  />
                </div>

                {/* Place of Supply */}
                {isGstInvoice && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <Label htmlFor="placeOfSupply" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Place of Supply *
                    </Label>
                    <select
                      id="placeOfSupply"
                      {...register('placeOfSupply')}
                      className="w-full h-10 rounded-lg border border-border/60 bg-transparent px-3 text-xs font-semibold"
                    >
                      {INDIAN_STATES.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                    {errors.placeOfSupply && (
                      <p className="text-[10px] font-bold text-destructive">{errors.placeOfSupply.message}</p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* GST Summary & Aggregates */}
            <div className="space-y-4">
              <InvoiceGstSummary />
              <InvoiceTotals />
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
}
