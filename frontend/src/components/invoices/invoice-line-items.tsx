'use client';

import React, { useEffect } from 'react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { Plus, Trash2, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProductSelect } from './product-select';
import { formatINR } from '@/lib/format';

export function InvoiceLineItems() {
  const { control, register, setValue, watch } = useFormContext();
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  // Watch the items array in real-time to compute individual row amounts
  const itemsWatch = useWatch({
    control,
    name: 'items',
  }) || [];

  // Enforce at least one row on mount
  useEffect(() => {
    if (fields.length === 0) {
      append({
        productId: '',
        name: '',
        hsnCode: '',
        quantity: 1,
        unit: 'PCS',
        rate: 0,
        discount: 0,
        gstRate: 18,
      });
    }
  }, [fields, append]);

  const handleProductSelect = (index: number, selection: { productId?: string; name: string; hsnCode: string; price: number; gstRate: number }) => {
    setValue(`items.${index}.productId`, selection.productId || '');
    setValue(`items.${index}.name`, selection.name);
    setValue(`items.${index}.hsnCode`, selection.hsnCode);
    setValue(`items.${index}.rate`, selection.price);
    setValue(`items.${index}.gstRate`, selection.gstRate);
  };

  return (
    <div className="p-6 border rounded-xl bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider flex items-center">
            <Sparkles className="h-4 w-4 text-indigo-400 mr-1.5 animate-pulse" /> Items List
          </h3>
          <p className="text-[10px] text-muted-foreground font-semibold">
            Invoices ke products aur services jodain
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            append({
              productId: '',
              name: '',
              hsnCode: '',
              quantity: 1,
              unit: 'PCS',
              rate: 0,
              discount: 0,
              gstRate: 18,
            })
          }
          className="h-8 px-3 font-bold text-xs uppercase text-indigo-400 hover:text-indigo-300 border-indigo-500/20"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Item Add Karo
        </Button>
      </div>

      <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
        <table className="w-full text-left border-collapse min-w-[700px] text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/10 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
              <th className="py-2.5 px-3 w-[10%] text-center">Order</th>
              <th className="py-2.5 px-3 w-[35%]">Product / Item *</th>
              <th className="py-2.5 px-3 w-[10%]">HSN</th>
              <th className="py-2.5 px-3 w-[10%] text-right">Qty *</th>
              <th className="py-2.5 px-3 w-[12%] text-right">Rate (₹) *</th>
              <th className="py-2.5 px-3 w-[8%] text-right">Disc (%)</th>
              <th className="py-2.5 px-3 w-[10%] text-right">GST Rate</th>
              <th className="py-2.5 px-3 w-[12%] text-right">Amount (₹)</th>
              <th className="py-2.5 px-3 w-[5%] text-center">✕</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {fields.map((field, index) => {
              // Extract values for this row to compute amount in real-time
              const rowValues = itemsWatch[index] || {};
              const qty = parseFloat(rowValues.quantity) || 0;
              const rate = parseFloat(rowValues.rate) || 0;
              const disc = parseFloat(rowValues.discount) || 0;
              
              // Calculate row taxable amount: qty * rate * (1 - disc / 100)
              const amount = qty * rate * (1 - disc / 100);

              return (
                <tr key={field.id} className="hover:bg-muted/5 transition-colors">
                  {/* Order / Reordering Tools */}
                  <td className="py-2 px-1 text-center">
                    <div className="flex items-center justify-center space-x-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                        className="h-6 w-6 rounded hover:bg-muted"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={index === fields.length - 1}
                        onClick={() => move(index, index + 1)}
                        className="h-6 w-6 rounded hover:bg-muted"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>

                  {/* Product Picker */}
                  <td className="py-2 px-2">
                    <ProductSelect
                      value={watch(`items.${index}.name`) || ''}
                      productId={watch(`items.${index}.productId`) || ''}
                      onChange={(sel) => handleProductSelect(index, sel)}
                    />
                  </td>

                  {/* HSN Code */}
                  <td className="py-2 px-2">
                    <Input
                      type="text"
                      placeholder="HSN"
                      {...register(`items.${index}.hsnCode`)}
                      className="h-9 text-xs text-center border-border/60 bg-transparent font-medium"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      step="any"
                      min="0.01"
                      placeholder="1"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                        required: true,
                        min: 0.01,
                      })}
                      className="h-9 text-xs text-right border-border/60 bg-transparent font-extrabold"
                    />
                  </td>

                  {/* Rate */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      {...register(`items.${index}.rate`, {
                        valueAsNumber: true,
                        required: true,
                        min: 0,
                      })}
                      className="h-9 text-xs text-right border-border/60 bg-transparent font-extrabold"
                    />
                  </td>

                  {/* Discount */}
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      {...register(`items.${index}.discount`, {
                        valueAsNumber: true,
                        min: 0,
                        max: 100,
                      })}
                      className="h-9 text-xs text-right border-border/60 bg-transparent font-semibold"
                    />
                  </td>

                  {/* GST Selector */}
                  <td className="py-2 px-2">
                    <select
                      {...register(`items.${index}.gstRate`, { valueAsNumber: true })}
                      className="w-full h-9 rounded border border-border/60 bg-transparent text-right pr-2 text-xs font-semibold"
                    >
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Calculated Amount */}
                  <td className="py-2 px-3 text-right font-black text-foreground">
                    {formatINR(amount)}
                  </td>

                  {/* Delete Button */}
                  <td className="py-2 px-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={fields.length === 1} // Enforce minimum 1 row strictly
                      onClick={() => remove(index)}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
