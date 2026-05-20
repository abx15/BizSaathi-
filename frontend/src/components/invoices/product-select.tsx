'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, Search, Loader2, Package, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getProducts, createProduct, Product } from '@/lib/api/invoices';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface ProductSelectProps {
  value: string; // current item name
  productId?: string;
  onChange: (selection: { productId?: string; name: string; hsnCode: string; price: number; gstRate: number }) => void;
  className?: string;
}

export function ProductSelect({ value, productId, onChange, className }: ProductSelectProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Search input state
  const [search, setSearch] = useState(value || '');
  const debouncedSearch = useDebounce(search, 300);

  // Inline product creation form states
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductGst, setNewProductGst] = useState(18);
  const [newProductHsn, setNewProductHsn] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sync search input with parent value changes
  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  // Fetch matching products
  const { data: productResponse, isLoading } = useQuery({
    queryKey: ['products', 'search', debouncedSearch],
    queryFn: () => getProducts(debouncedSearch),
    enabled: open,
  });

  const productsList = productResponse?.data?.items || [];

  const handleSelectProduct = (prod: Product) => {
    onChange({
      productId: prod.id,
      name: prod.name,
      hsnCode: prod.hsnCode || '',
      price: prod.price || 0,
      gstRate: prod.gstRate || 0,
    });
    setOpen(false);
  };

  const handleCustomTextUse = () => {
    if (!search.trim()) return;
    
    onChange({
      productId: undefined,
      name: search,
      hsnCode: '',
      price: 0,
      gstRate: 18, // Default 18%
    });
    setOpen(false);
  };

  const handleQuickCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.error('Item ka naam likhna anivary hai!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createProduct({
        name: newProductName,
        price: newProductPrice,
        gstRate: newProductGst,
        hsnCode: newProductHsn || null,
        unit: 'PCS', // Standard default unit
      });

      if (res.success && res.data) {
        toast.success(`Naya item "${res.data.name}" safaltapurvak joda gaya!`);
        queryClient.invalidateQueries({ queryKey: ['products'] });

        // Select newly created product
        onChange({
          productId: res.data.id,
          name: res.data.name,
          hsnCode: res.data.hsnCode || '',
          price: res.data.price || 0,
          gstRate: res.data.gstRate || 0,
        });

        // Close dialog forms
        setDialogOpen(false);
        setOpen(false);

        // Reset fields
        setNewProductName('');
        setNewProductPrice(0);
        setNewProductGst(18);
        setNewProductHsn('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Product create karne mein truti hui.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-9 px-2 bg-transparent hover:bg-muted/30 font-medium text-left rounded border border-border/40 text-xs"
          >
            <span className="truncate text-foreground font-semibold">
              {value || 'Product select karein...'}
            </span>
            <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[280px] sm:w-[320px] p-0 rounded-lg shadow-lg border" align="start">
          <div className="flex items-center border-b px-2.5">
            <Search className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-50" />
            <input
              placeholder="Search or type custom name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-9 w-full rounded-md bg-transparent py-2.5 text-xs outline-none placeholder:text-muted-foreground"
            />
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>

          <div className="max-h-[200px] overflow-y-auto p-1 divide-y divide-border/10">
            {/* Custom search query addition fallback */}
            {search.trim() !== '' && !productsList.some((p) => p.name.toLowerCase() === search.toLowerCase()) && (
              <div
                onClick={handleCustomTextUse}
                className="flex items-center p-2 rounded cursor-pointer hover:bg-indigo-500/10 text-indigo-400 text-xs font-bold"
              >
                <Tag className="h-3.5 w-3.5 mr-1.5" />
                <span>Use custom: "{search}"</span>
              </div>
            )}

            {productsList.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground font-medium">
                {isLoading ? 'Searching...' : 'Koi matching product nahi mila.'}
              </div>
            ) : (
              productsList.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className={cn(
                    'flex items-center justify-between p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors text-xs font-semibold',
                    productId === prod.id ? 'bg-primary/5 text-primary font-bold' : 'text-foreground'
                  )}
                >
                  <div className="truncate flex-1 pr-2">
                    <span className="block truncate font-bold">{prod.name}</span>
                    <div className="flex items-center space-x-2 text-[10px] text-muted-foreground font-medium mt-0.5">
                      <span>Rate: ₹{prod.price}</span>
                      <span>·</span>
                      <span>GST: {prod.gstRate}%</span>
                    </div>
                  </div>
                  {productId === prod.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </div>
              ))
            )}
          </div>

          {/* Quick Create Dialog Trigger */}
          <div className="p-1 border-t bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNewProductName(search);
                setDialogOpen(true);
              }}
              className="w-full h-8 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 justify-start"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Naya Product Banao
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialog Form to quickly add a product */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[360px] p-6 rounded-xl border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center space-x-2">
              <Package className="h-5 w-5 text-indigo-400" />
              <span>Naya Product/Item Banao</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleQuickCreateProduct} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="prod-name" className="text-xs font-bold uppercase">Item Name *</Label>
              <Input
                id="prod-name"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="Product ka naam..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="prod-price" className="text-xs font-bold uppercase">Price (₹) *</Label>
                <Input
                  id="prod-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProductPrice}
                  onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-gst" className="text-xs font-bold uppercase">GST Rate (%)</Label>
                <select
                  id="prod-gst"
                  value={newProductGst}
                  onChange={(e) => setNewProductGst(parseInt(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs outline-none"
                >
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="prod-hsn" className="text-xs font-bold uppercase">HSN Code</Label>
              <Input
                id="prod-hsn"
                value={newProductHsn}
                onChange={(e) => setNewProductHsn(e.target.value)}
                placeholder="e.g. 9401"
              />
            </div>

            <DialogFooter className="pt-4 border-t flex flex-row items-center justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                className="font-bold text-xs uppercase"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="font-bold text-xs uppercase bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Save Ho Raha...
                  </>
                ) : (
                  'Create Item'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default ProductSelect;
