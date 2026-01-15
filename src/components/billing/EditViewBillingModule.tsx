import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Hash, 
  Package, 
  Users, 
  ArrowLeft,
  Printer,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Save,
  X,
  Minus,
  Plus,
  Trash2,
  MessageSquare,
  Lock,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  useUpdateBillMutation, 
  useGetProductsQuery,
  useUpdateTableMutation,
  useAddPaymentDetailsMutation,
} from '@/store/redux/api/billingApi';
import { BillTemplate } from '@/components/print/BillTemplate';
import { BillSummary } from './BillSummary';
import type { ProductWithPortions, DbProductPortion } from '@/types/database';

interface BillItem {
  id: string;
  product_id: string;
  product_name: string;
  product_code: string;
  portion: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  notes: string | null;
  sent_to_kitchen: boolean;
}

interface BillData {
  id: string;
  bill_number: string;
  type: string;
  table_id: string | null;
  table_number: string | null;
  token_number: number | null;
  sub_total: number;
  discount_amount: number;
  discount_type: string | null;
  discount_value: number | null;
  discount_reason: string | null;
  cgst_amount: number;
  sgst_amount: number;
  total_amount: number;
  final_amount: number;
  cover_count: number | null;
  status: string;
  payment_method: string | null;
  created_at: string;
  settled_at: string | null;
}

interface EditViewBillingModuleProps {
  bill: BillData;
  initialItems: BillItem[];
  isEditMode: boolean;
  onModeChange: (isEdit: boolean) => void;
  onBillUpdated: () => void;
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function calculateTotals(items: BillItem[], discountType?: string | null, discountValue?: number | null) {
  const subTotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);

  let discountAmount = 0;
  if (discountType && discountValue) {
    discountAmount = discountType === 'percentage'
      ? (subTotal * discountValue / 100)
      : discountValue;
  }

  const afterDiscount = subTotal - discountAmount;

  let totalGst = 0;
  items.forEach(item => {
    const itemTotal = item.unit_price * item.quantity;
    const itemDiscount = discountAmount > 0 && subTotal > 0 ? (itemTotal / subTotal) * discountAmount : 0;
    const taxableAmount = itemTotal - itemDiscount;
    totalGst += taxableAmount * (item.gst_rate / 100);
  });

  const cgstAmount = totalGst / 2;
  const sgstAmount = totalGst / 2;
  const totalAmount = afterDiscount + totalGst;
  const finalAmount = Math.round(totalAmount);

  return { subTotal, discountAmount, cgstAmount, sgstAmount, totalAmount, finalAmount };
}

export function EditViewBillingModule({ 
  bill, 
  initialItems, 
  isEditMode, 
  onModeChange,
  onBillUpdated,
}: EditViewBillingModuleProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<BillItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [showTotalSummary, setShowTotalSummary] = useState(false);
  
  // Item search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductWithPortions[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPortionSelect, setShowPortionSelect] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPortions | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<DbProductPortion | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [searchStep, setSearchStep] = useState<'search' | 'portion' | 'quantity'>('search');
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [updateBill] = useUpdateBillMutation();
  const [updateTable] = useUpdateTableMutation();
  const [addPaymentDetails] = useAddPaymentDetailsMutation();
  const { data: products = [] } = useGetProductsQuery();

  // Calculate totals
  const totals = useMemo(() => {
    return calculateTotals(items, bill.discount_type, bill.discount_value);
  }, [items, bill.discount_type, bill.discount_value]);

  // Track if there are changes
  const hasChanges = useMemo(() => {
    const originalStr = JSON.stringify(initialItems.map(i => ({ id: i.id, quantity: i.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
    const currentStr = JSON.stringify(items.map(i => ({ id: i.id, quantity: i.quantity })).sort((a, b) => a.id.localeCompare(b.id)));
    return originalStr !== currentStr || items.length !== initialItems.length;
  }, [items, initialItems]);

  // Focus search on edit mode
  useEffect(() => {
    if (isEditMode) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isEditMode]);

  // Product search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSuggestions([]);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const filtered = products
      .filter(p => p.is_active)
      .filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      )
      .slice(0, 5);

    setSuggestions(filtered);
    setSelectedIndex(0);
  }, [searchQuery, products]);

  // Handle product selection
  const handleSelectProduct = useCallback((product: ProductWithPortions) => {
    setSelectedProduct(product);

    if (!product.portions || product.portions.length === 0) {
      return;
    }

    if (product.portions.length === 1) {
      setSelectedPortion(product.portions[0]);
      setSearchStep('quantity');
      setShowPortionSelect(false);
      setTimeout(() => quantityInputRef.current?.focus(), 50);
    } else {
      setSearchStep('portion');
      setShowPortionSelect(true);
      setSelectedIndex(0);
    }
  }, []);

  const handleSelectPortion = useCallback((portion: DbProductPortion) => {
    setSelectedPortion(portion);
    setSearchStep('quantity');
    setShowPortionSelect(false);
    setTimeout(() => quantityInputRef.current?.focus(), 50);
  }, []);

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || !selectedPortion) return;

    const qty = parseInt(quantity) || 1;
    
    // Check if item already exists
    const existingIndex = items.findIndex(
      item => item.product_id === selectedProduct.id && item.portion === selectedPortion.size
    );

    if (existingIndex >= 0) {
      // Update quantity
      setItems(prev => prev.map((item, idx) => 
        idx === existingIndex 
          ? { ...item, quantity: item.quantity + qty }
          : item
      ));
    } else {
      // Add new item
      const newItem: BillItem = {
        id: `new-${crypto.randomUUID()}`,
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        product_code: selectedProduct.code,
        portion: selectedPortion.size,
        quantity: qty,
        unit_price: selectedPortion.price,
        gst_rate: selectedProduct.gst_rate,
        notes: null,
        sent_to_kitchen: false,
      };
      setItems(prev => [...prev, newItem]);
    }

    // Reset search state
    setSearchQuery('');
    setSuggestions([]);
    setSelectedProduct(null);
    setSelectedPortion(null);
    setQuantity('1');
    setSearchStep('search');
    setShowPortionSelect(false);
    searchInputRef.current?.focus();
  }, [selectedProduct, selectedPortion, quantity, items]);

  // Handle search keyboard navigation
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (searchStep === 'search') {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && suggestions.length > 0) {
        e.preventDefault();
        handleSelectProduct(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSearchQuery('');
        setSuggestions([]);
      }
    } else if (searchStep === 'portion' && selectedProduct) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, selectedProduct.portions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectPortion(selectedProduct.portions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSearchStep('search');
        setShowPortionSelect(false);
        setSelectedProduct(null);
        searchInputRef.current?.focus();
      }
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === 'Escape') {
      setSearchStep('search');
      setSelectedProduct(null);
      setSelectedPortion(null);
      setQuantity('1');
      searchInputRef.current?.focus();
    }
  };

  // Portion selection global keyboard
  useEffect(() => {
    if (searchStep !== 'portion' || !selectedProduct) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, selectedProduct.portions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectPortion(selectedProduct.portions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setSearchStep('search');
        setShowPortionSelect(false);
        setSelectedProduct(null);
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [searchStep, selectedProduct, selectedIndex, handleSelectPortion]);

  // Cart item handlers
  const handleQuantityChange = (itemId: string, delta: number) => {
    setItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item?.sent_to_kitchen) {
      toast.error('Cannot remove items already sent to kitchen');
      return;
    }
    if (items.length <= 1) {
      toast.error('Bill must have at least one item');
      return;
    }
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Cart keyboard navigation
  const handleCartKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      items.length === 0 ||
      !isEditMode
    ) {
      return;
    }

    const currentItem = focusedItemIndex >= 0 ? items[focusedItemIndex] : null;

    switch (e.key) {
      case 'ArrowUp':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (focusedItemIndex > 0) {
            setFocusedItemIndex(focusedItemIndex - 1);
            itemRefs.current.get(focusedItemIndex - 1)?.scrollIntoView({ block: 'nearest' });
          }
        }
        break;
      case 'ArrowDown':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (focusedItemIndex < items.length - 1) {
            setFocusedItemIndex(focusedItemIndex + 1);
            itemRefs.current.get(focusedItemIndex + 1)?.scrollIntoView({ block: 'nearest' });
          }
        }
        break;
      case 'ArrowLeft':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          if (!currentItem.sent_to_kitchen && currentItem.quantity > 1) {
            handleQuantityChange(currentItem.id, -1);
          }
        }
        break;
      case 'ArrowRight':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          handleQuantityChange(currentItem.id, 1);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          if (!currentItem.sent_to_kitchen && items.length > 1) {
            handleRemoveItem(currentItem.id);
            if (focusedItemIndex >= items.length - 1) {
              setFocusedItemIndex(Math.max(0, items.length - 2));
            }
          }
        }
        break;
    }
  }, [focusedItemIndex, items, isEditMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleCartKeyDown);
    return () => window.removeEventListener('keydown', handleCartKeyDown);
  }, [handleCartKeyDown]);

  // Save changes
  const handleSave = async () => {
    if (items.length === 0 || items.every(item => item.quantity < 1)) {
      toast.error('Bill must have at least one item with quantity of 1 or more');
      return;
    }

    setIsSaving(true);
    try {
      // Update existing items
      for (const item of items) {
        if (item.id.startsWith('new-')) continue;
        
        const original = initialItems.find(i => i.id === item.id);
        if (original && original.quantity !== item.quantity) {
          await supabase
            .from('bill_items')
            .update({ quantity: item.quantity })
            .eq('id', item.id);
        }
      }

      // Add new items
      const newItems = items.filter(i => i.id.startsWith('new-'));
      if (newItems.length > 0) {
        const { error } = await supabase
          .from('bill_items')
          .insert(newItems.map(item => ({
            bill_id: bill.id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            portion: item.portion,
            quantity: item.quantity,
            unit_price: item.unit_price,
            gst_rate: item.gst_rate,
            notes: item.notes,
            sent_to_kitchen: false,
          })));
        
        if (error) throw error;
      }

      // Delete removed items
      const removedIds = initialItems
        .filter(original => !items.find(current => current.id === original.id))
        .map(item => item.id);

      if (removedIds.length > 0) {
        await supabase
          .from('bill_items')
          .delete()
          .in('id', removedIds);
      }

      // Update bill totals
      await updateBill({
        id: bill.id,
        updates: {
          sub_total: totals.subTotal,
          discount_amount: totals.discountAmount,
          cgst_amount: totals.cgstAmount,
          sgst_amount: totals.sgstAmount,
          total_amount: totals.totalAmount,
          final_amount: totals.finalAmount,
        },
      }).unwrap();

      // Update table amount if applicable
      if (bill.table_id) {
        await supabase
          .from('tables')
          .update({ current_amount: totals.finalAmount })
          .eq('id', bill.table_id);
      }

      toast.success('Bill updated successfully');
      onBillUpdated();
      onModeChange(false);
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  // Settle bill
  const handleSettleBill = async (method: 'cash' | 'card' | 'upi') => {
    setShowPaymentDialog(false);
    setShowBillPreview(true);

    try {
      // First save any changes
      if (hasChanges) {
        await handleSave();
      }

      // Update bill status
      await updateBill({
        id: bill.id,
        updates: {
          status: 'settled',
          payment_method: method,
          settled_at: new Date().toISOString(),
        },
      }).unwrap();

      // Free up the table
      if (bill.table_id) {
        await updateTable({
          id: bill.table_id,
          updates: {
            status: 'available',
            current_bill_id: null,
            current_amount: null,
          },
        }).unwrap();
      }

      toast.success('Bill settled successfully');
      
      setTimeout(() => {
        setShowBillPreview(false);
        navigate('/history');
      }, 500);
    } catch (error) {
      console.error('Error settling bill:', error);
      toast.error('Failed to settle bill');
      setShowBillPreview(false);
    }
  };

  const handleCancelEdit = () => {
    setItems(initialItems);
    onModeChange(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Store item ref
  const setItemRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(index, el);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

  const isParcel = bill.type === 'parcel';
  const canSettle = bill.status !== 'settled';
  const canEdit = bill.status !== 'settled';

  // Separate items by KOT status
  const sentItems = items.filter(item => item.sent_to_kitchen);
  const pendingItems = items.filter(item => !item.sent_to_kitchen);

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Left Panel - Bill Info */}
      <div className="fixed w-[calc(100%_-_480px)] h-[calc(100vh_-_50px)] left-0 flex-1 flex flex-col border-r border-border min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {bill.bill_number}
                {isEditMode && (
                  <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30">
                    Editing
                  </Badge>
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                {new Date(bill.created_at).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {isEditMode && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can add new items, modify quantities, or remove items. At least one item must remain.
              </AlertDescription>
            </Alert>
          )}

          {/* Bill Info Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {isParcel ? (
                    <Package className="h-5 w-5 text-primary" />
                  ) : (
                    <Hash className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold capitalize">{bill.type}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <span className="font-bold text-muted-foreground">
                    {isParcel ? `#${bill.token_number}` : bill.table_number}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isParcel ? 'Token' : 'Table'}
                  </p>
                  <p className="font-semibold">
                    {isParcel ? `Token ${bill.token_number}` : bill.table_number}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-10 px-4 text-sm",
                    bill.status === 'settled' && "bg-success/10 text-success border-success/30",
                    bill.status === 'unsettled' && "bg-warning/10 text-warning border-warning/30",
                    bill.status === 'active' && "bg-accent/10 text-accent border-accent/30"
                  )}
                >
                  {bill.status.toUpperCase()}
                </Badge>
                <div>
                  <p className="text-sm text-muted-foreground">Payment</p>
                  <p className="font-semibold capitalize">
                    {bill.payment_method || 'Pending'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Totals */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Bill Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.subTotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-warning">
                  <span>Discount</span>
                  <span>-{formatCurrency(totals.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(totals.cgstAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(totals.sgstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-success">{formatCurrency(totals.finalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Cart/Items */}
      <div className="fixed right-0 w-[480px] h-[calc(100vh_-_50px)] flex flex-col bg-card shrink-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-border p-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              {isParcel ? (
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  <span className="text-lg font-semibold">Parcel #{bill.token_number}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-success" />
                  <span className="text-lg font-semibold">Table {bill.table_number}</span>
                </div>
              )}
            </div>
            {!isParcel && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Covers: {bill.cover_count || 1}</span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Bill ID: {bill.id.slice(0, 8)}...
          </p>
        </div>

        {/* Item Search - Only in Edit Mode */}
        {isEditMode && (
          <div className="p-4 border-b border-border shrink-0 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search items to add..."
                className="pl-10 bg-secondary border-border focus:border-primary"
                disabled={searchStep !== 'search'}
              />
            </div>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && searchStep === 'search' && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up">
                {suggestions.map((product, index) => (
                  <div
                    key={product.id}
                    className={cn(
                      "suggestion-item cursor-pointer transition-colors",
                      index === selectedIndex && "bg-accent/30 border-l-2 border-l-accent"
                    )}
                    onClick={() => handleSelectProduct(product)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-10">{product.code}</span>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <span className="text-sm text-success">
                      ₹{product.portions[0]?.price || 0}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Portion Selection */}
            {showPortionSelect && selectedProduct && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up">
                <div className="px-3 py-2 border-b border-border bg-muted/50">
                  <span className="text-sm font-medium text-accent">{selectedProduct.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">Select portion</span>
                </div>
                {selectedProduct.portions.map((portion, index) => (
                  <div
                    key={portion.size}
                    className={cn(
                      "suggestion-item cursor-pointer transition-colors",
                      index === selectedIndex && "bg-accent/30 border-l-2 border-l-accent"
                    )}
                    onClick={() => handleSelectPortion(portion)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <span className="capitalize font-medium">{portion.size}</span>
                    <span className="text-sm text-success">₹{portion.price}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity Input */}
            {searchStep === 'quantity' && selectedProduct && selectedPortion && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium">{selectedProduct.name}</span>
                    <span className="text-muted-foreground ml-2 capitalize">({selectedPortion.size})</span>
                  </div>
                  <span className="text-success">₹{selectedPortion.price}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
                    <Input
                      ref={quantityInputRef}
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      onKeyDown={handleQuantityKeyDown}
                      className="bg-secondary text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
                    <div className="h-10 flex items-center justify-center bg-muted rounded-md text-success">
                      ₹{selectedPortion.price * (parseInt(quantity) || 1)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Press <kbd className="kbd">Enter</kbd> to add</span>
                  <span>Press <kbd className="kbd">Esc</kbd> to cancel</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 min-h-0">
          {isEditMode && (
            <div className="text-xs text-muted-foreground/70 flex items-center gap-3 pb-2 border-b border-border">
              <span><kbd className="kbd text-[10px]">Ctrl+↑↓</kbd> Navigate</span>
              <span><kbd className="kbd text-[10px]">Ctrl+←→</kbd> Qty</span>
              <span><kbd className="kbd text-[10px]">Ctrl+Del</kbd> Remove</span>
            </div>
          )}

          {/* Sent to Kitchen Section */}
          {sentItems.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Sent to Kitchen ({sentItems.length})
              </p>
              <div className="space-y-2">
                {sentItems.map((item, index) => {
                  const globalIndex = index;
                  const isFocused = focusedItemIndex === globalIndex;
                  
                  return (
                    <div
                      key={item.id}
                      ref={(el) => setItemRef(globalIndex, el)}
                      tabIndex={0}
                      onClick={() => setFocusedItemIndex(globalIndex)}
                      className={cn(
                        "cart-item animate-slide-up outline-none cart-item-sent opacity-80",
                        isFocused && isEditMode && "cart-item-focused"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{item.product_code}</span>
                              <span className="font-medium truncate">{item.product_name}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Sent to kitchen - cannot be modified</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="capitalize">{item.portion}</span>
                              <span>×</span>
                              <span>₹{item.unit_price}</span>
                            </div>
                          </div>
                          <span className="font-semibold text-success shrink-0">
                            ₹{item.unit_price * item.quantity}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-50" disabled>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-50" disabled>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7 opacity-50" disabled>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Items */}
          {pendingItems.length > 0 && (
            <div>
              {sentItems.length > 0 && (
                <p className="text-xs text-muted-foreground mb-2 mt-4">
                  Pending ({pendingItems.length})
                </p>
              )}
              <div className="space-y-2">
                {pendingItems.map((item, index) => {
                  const globalIndex = sentItems.length + index;
                  const isFocused = focusedItemIndex === globalIndex;
                  
                  return (
                    <div
                      key={item.id}
                      ref={(el) => setItemRef(globalIndex, el)}
                      tabIndex={0}
                      onClick={() => setFocusedItemIndex(globalIndex)}
                      className={cn(
                        "cart-item animate-slide-up outline-none cart-item-pending",
                        isFocused && isEditMode && "cart-item-focused"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{item.product_code}</span>
                              <span className="font-medium truncate">{item.product_name}</span>
                              {item.id.startsWith('new-') && (
                                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                                  New
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="capitalize">{item.portion}</span>
                              <span>×</span>
                              <span>₹{item.unit_price}</span>
                            </div>
                          </div>
                          <span className="font-semibold text-success shrink-0">
                            ₹{item.unit_price * item.quantity}
                          </span>
                        </div>

                        {isEditMode && (
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleQuantityChange(item.id, -1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleQuantityChange(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={items.length <= 1}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isEditMode && (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-muted-foreground">Qty: {item.quantity}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="action-bar border-t border-border p-4 bg-background">
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                {canSettle && (
                  <Button 
                    className="gap-1.5 bg-success hover:bg-success/90 ml-auto"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <Receipt className="h-4 w-4" />
                    Settle Bill
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                {canEdit && (
                  <Button onClick={() => onModeChange(true)}>
                    Edit Bill
                  </Button>
                )}
                {canSettle && (
                  <Button 
                    className="gap-1.5 bg-success hover:bg-success/90 ml-auto"
                    onClick={() => setShowPaymentDialog(true)}
                  >
                    <Receipt className="h-4 w-4" />
                    Settle Bill
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Payment Method</DialogTitle>
          </DialogHeader>
          <div className="text-center mb-4">
            <span className="text-3xl font-bold text-success">{formatCurrency(totals.finalAmount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-success/10 hover:border-success hover:text-success"
              onClick={() => handleSettleBill('cash')}
            >
              <Banknote className="h-8 w-8" />
              <span>Cash</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-blue-500/10 hover:border-blue-500 hover:text-blue-400"
              onClick={() => handleSettleBill('card')}
            >
              <CreditCard className="h-8 w-8" />
              <span>Card</span>
            </Button>
            <Button
              variant="outline"
              className="h-24 flex-col gap-2 hover:bg-purple-500/10 hover:border-purple-500 hover:text-purple-400"
              onClick={() => handleSettleBill('upi')}
            >
              <Smartphone className="h-8 w-8" />
              <span>UPI</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bill Preview Dialog */}
      <Dialog open={showBillPreview} onOpenChange={setShowBillPreview}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bill Preview</DialogTitle>
          </DialogHeader>
          <div className="bg-white rounded-lg overflow-hidden">
            <BillTemplate
              ref={billRef}
              billNumber={bill.bill_number}
              tableNumber={bill.table_number || undefined}
              items={items.map(item => ({
                id: item.id,
                productId: item.product_id,
                productName: item.product_name,
                productCode: item.product_code,
                portion: item.portion,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                gstRate: item.gst_rate,
                sentToKitchen: item.sent_to_kitchen,
                printedQuantity: item.quantity,
              }))}
              subTotal={totals.subTotal}
              discountAmount={totals.discountAmount}
              cgstAmount={totals.cgstAmount}
              sgstAmount={totals.sgstAmount}
              totalAmount={totals.totalAmount}
              finalAmount={totals.finalAmount}
              isParcel={isParcel}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
