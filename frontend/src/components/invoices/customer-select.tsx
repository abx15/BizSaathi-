'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Plus, UserPlus, Phone, MapPin, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getCustomers, createCustomer, Customer } from '@/lib/api/invoices';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface CustomerSelectProps {
  value?: string;
  onChange: (customerId: string, customer?: Customer) => void;
  error?: string;
}

export function CustomerSelect({ value, onChange, error }: CustomerSelectProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Search query state
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Form states for quick inline customer creation
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerCity, setNewCustomerCity] = useState('');
  const [newCustomerGstin, setNewCustomerGstin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers
  const { data: customerResponse, isLoading } = useQuery({
    queryKey: ['customers', 'search', debouncedSearch],
    queryFn: () => getCustomers(debouncedSearch),
    enabled: open, // only fetch when dropdown is opened
  });

  const customersList = customerResponse?.data?.items || [];
  
  // Find selected customer object
  const selectedCustomer = customersList.find((c) => c.id === value) || null;

  // Handle customer creation
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      toast.error('Grahak ka naam likhna anivary hai!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createCustomer({
        name: newCustomerName,
        phone: newCustomerPhone || null,
        city: newCustomerCity || null,
        gstin: newCustomerGstin || null,
      });

      if (res.success && res.data) {
        toast.success(`Naya grahak "${res.data.name}" safaltapurvak joda gaya!`);
        
        // Refetch customers query
        queryClient.invalidateQueries({ queryKey: ['customers'] });
        
        // Select newly created customer
        onChange(res.data.id, res.data);
        
        // Close form dialog and main popover
        setDialogOpen(false);
        setOpen(false);
        
        // Reset form inputs
        setNewCustomerName('');
        setNewCustomerPhone('');
        setNewCustomerCity('');
        setNewCustomerGstin('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Customer create karne mein truti hui.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <Label className={cn('text-xs font-bold uppercase tracking-wider', error && 'text-destructive')}>
        Customer Chunein *
      </Label>
      <div className="flex space-x-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                'w-full justify-between h-10 px-3 bg-card font-medium text-left border rounded-lg',
                error ? 'border-destructive focus-visible:ring-destructive' : 'border-input',
                !value && 'text-muted-foreground'
              )}
            >
              <div className="truncate flex items-center space-x-2">
                {selectedCustomer ? (
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-foreground">{selectedCustomer.name}</span>
                    {selectedCustomer.city && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-semibold text-muted-foreground">
                        {selectedCustomer.city}
                      </span>
                    )}
                  </div>
                ) : (
                  <span>Grahak ka naam search karein...</span>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[300px] sm:w-[400px] p-0 rounded-lg shadow-lg border" align="start">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Grahak ka naam, phone ya shahar likhein..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-10 w-full rounded-md bg-transparent py-3 text-xs outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="max-h-[220px] overflow-y-auto p-1 divide-y divide-border/20">
              {customersList.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground font-medium">
                  {isLoading ? 'Koshish jari hai...' : 'Koi grahak nahi mila.'}
                </div>
              ) : (
                customersList.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onChange(cust.id, cust);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex items-center justify-between p-2.5 rounded-md cursor-pointer hover:bg-muted/60 transition-colors text-xs font-semibold',
                      value === cust.id ? 'bg-primary/5 text-primary' : 'text-foreground'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="font-bold truncate">{cust.name}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-muted-foreground mt-0.5 font-medium">
                        {cust.phone && (
                          <span className="flex items-center">
                            <Phone className="h-2.5 w-2.5 mr-0.5" /> {cust.phone}
                          </span>
                        )}
                        {cust.city && (
                          <span className="flex items-center">
                            <MapPin className="h-2.5 w-2.5 mr-0.5" /> {cust.city}
                          </span>
                        )}
                      </div>
                    </div>
                    {value === cust.id && <Check className="h-4 w-4 text-primary shrink-0 ml-2" />}
                  </div>
                ))
              )}
            </div>

            {/* Quick Create Dialog Trigger option at the bottom */}
            <div className="p-1 border-t bg-muted/20">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="w-full h-8 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 justify-start"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Naya Customer Banao
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Dialog form for creating a new customer */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-[400px] p-6 rounded-xl border">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <span>Naya Grahak Add Karein</span>
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleQuickCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="cust-name" className="text-xs font-bold uppercase">Name *</Label>
                <Input
                  id="cust-name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Grahak ya business ka naam..."
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-phone" className="text-xs font-bold uppercase">Phone Number</Label>
                <Input
                  id="cust-phone"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="10-digit number e.g. 9876543210"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-city" className="text-xs font-bold uppercase">City</Label>
                  <Input
                    id="cust-city"
                    value={newCustomerCity}
                    onChange={(e) => setNewCustomerCity(e.target.value)}
                    placeholder="Delhi"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cust-gst" className="text-xs font-bold uppercase">GSTIN (Optional)</Label>
                  <Input
                    id="cust-gst"
                    value={newCustomerGstin}
                    onChange={(e) => setNewCustomerGstin(e.target.value)}
                    placeholder="07AAAAA0000A1Z5"
                    className="uppercase"
                  />
                </div>
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
                    'Save Customer'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {error && <p className="text-[10px] font-bold text-destructive">{error}</p>}
    </div>
  );
}
