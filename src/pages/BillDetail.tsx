import { useState, useMemo, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Printer,
  Edit3,
  Save,
  X,
  Plus,
  Minus,
  Trash2,
  Receipt,
  UtensilsCrossed,
  Package,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useGetBillsQuery, useUpdateBillMutation } from '@/store/redux/api/billingApi';

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
  items: BillItem[];
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

  // Calculate GST
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

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = searchParams.get('isEdit') === 'true';

  const [bill, setBill] = useState<BillData | null>(null);
  const [editedItems, setEditedItems] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const [updateBill] = useUpdateBillMutation();

  // Fetch bill data
  useEffect(() => {
    async function fetchBill() {
      if (!id) return;

      setIsLoading(true);
      try {
        const { data: billData, error: billError } = await supabase
          .from('bills')
          .select('*')
          .eq('id', id)
          .single();

        if (billError) throw billError;

        const { data: items, error: itemsError } = await supabase
          .from('bill_items')
          .select('*')
          .eq('bill_id', id);

        if (itemsError) throw itemsError;

        const fullBill: BillData = {
          ...billData,
          items: items || [],
        };

        setBill(fullBill);
        setEditedItems(items || []);
      } catch (error) {
        console.error('Error fetching bill:', error);
        toast.error('Failed to load bill');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBill();
  }, [id]);

  // Calculate totals for edited items
  const calculatedTotals = useMemo(() => {
    if (!bill) return null;
    return calculateTotals(editedItems, bill.discount_type, bill.discount_value);
  }, [editedItems, bill?.discount_type, bill?.discount_value]);

  // Track changes
  useEffect(() => {
    if (!bill) return;
    const originalItemsStr = JSON.stringify(bill.items.map(i => ({ id: i.id, quantity: i.quantity })));
    const editedItemsStr = JSON.stringify(editedItems.map(i => ({ id: i.id, quantity: i.quantity })));
    setHasChanges(originalItemsStr !== editedItemsStr);
  }, [bill, editedItems]);

  const handleQuantityChange = (itemId: string, delta: number) => {
    setEditedItems(items =>
      items.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (itemId: string) => {
    // Ensure at least one item remains with quantity >= 1
    if (editedItems.length <= 1) {
      toast.error('Bill must have at least one item');
      return;
    }
    setEditedItems(items => items.filter(item => item.id !== itemId));
  };

  const handleSave = async () => {
    if (!bill || !calculatedTotals) return;

    // Validate: at least one item with quantity >= 1
    if (editedItems.length === 0 || editedItems.every(item => item.quantity < 1)) {
      toast.error('Bill must have at least one item with quantity of 1 or more');
      return;
    }

    setIsSaving(true);
    try {
      // Update bill items in database
      for (const item of editedItems) {
        const originalItem = bill.items.find(i => i.id === item.id);
        if (originalItem && originalItem.quantity !== item.quantity) {
          await supabase
            .from('bill_items')
            .update({ quantity: item.quantity })
            .eq('id', item.id);
        }
      }

      // Delete removed items
      const removedItemIds = bill.items
        .filter(original => !editedItems.find(edited => edited.id === original.id))
        .map(item => item.id);

      if (removedItemIds.length > 0) {
        await supabase
          .from('bill_items')
          .delete()
          .in('id', removedItemIds);
      }

      // Update bill totals
      await updateBill({
        id: bill.id,
        updates: {
          sub_total: calculatedTotals.subTotal,
          discount_amount: calculatedTotals.discountAmount,
          cgst_amount: calculatedTotals.cgstAmount,
          sgst_amount: calculatedTotals.sgstAmount,
          total_amount: calculatedTotals.totalAmount,
          final_amount: calculatedTotals.finalAmount,
        },
      }).unwrap();

      // Update table amount if applicable
      if (bill.table_id) {
        await supabase
          .from('tables')
          .update({ current_amount: calculatedTotals.finalAmount })
          .eq('id', bill.table_id);
      }

      toast.success('Bill updated successfully');
      
      // Refresh bill data
      setBill({
        ...bill,
        items: editedItems,
        sub_total: calculatedTotals.subTotal,
        discount_amount: calculatedTotals.discountAmount,
        cgst_amount: calculatedTotals.cgstAmount,
        sgst_amount: calculatedTotals.sgstAmount,
        total_amount: calculatedTotals.totalAmount,
        final_amount: calculatedTotals.finalAmount,
      });
      setHasChanges(false);

      // Exit edit mode
      navigate(`/bill/${id}?isEdit=false`, { replace: true });
    } catch (error) {
      console.error('Error saving bill:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (bill) {
      setEditedItems(bill.items);
    }
    navigate(`/bill/${id}?isEdit=false`, { replace: true });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Bill Not Found</h2>
        <p className="text-muted-foreground mb-4">The bill you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/history')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
      </div>
    );
  }

  const displayItems = isEditMode ? editedItems : bill.items;
  const displayTotals = isEditMode && calculatedTotals ? calculatedTotals : {
    subTotal: bill.sub_total,
    discountAmount: bill.discount_amount,
    cgstAmount: bill.cgst_amount,
    sgstAmount: bill.sgst_amount,
    totalAmount: bill.total_amount,
    finalAmount: bill.final_amount,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
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
            <p className="text-muted-foreground">
              {format(new Date(bill.created_at), 'EEEE, dd MMMM yyyy • hh:mm a')}
            </p>
          </div>
        </div>
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
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              {bill.status !== 'settled' && (
                <Button onClick={() => navigate(`/bill/${id}?isEdit=true`, { replace: true })}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Bill
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {isEditMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You can modify item quantities or remove items. At least one item with quantity ≥ 1 must remain.
            Bills cannot be deleted from this page.
          </AlertDescription>
        </Alert>
      )}

      {/* Bill Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                {bill.type === 'table' ? (
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                ) : (
                  <Package className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Type</p>
                <p className="font-semibold capitalize">{bill.type}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <span className="font-bold text-muted-foreground">
                  {bill.type === 'table' ? bill.table_number : `#${bill.token_number}`}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {bill.type === 'table' ? 'Table' : 'Token'}
                </p>
                <p className="font-semibold">
                  {bill.type === 'table' ? bill.table_number : `Token ${bill.token_number}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({displayItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayItems.map((item, index) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  isEditMode && "bg-muted/30"
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{index + 1}.</span>
                    <span className="font-medium">{item.product_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {item.portion}
                    </Badge>
                    {item.sent_to_kitchen && (
                      <Badge variant="secondary" className="text-xs">
                        KOT Sent
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                  </div>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      Note: {item.notes}
                    </p>
                  )}
                </div>

                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-background border rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleQuantityChange(item.id, 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={editedItems.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <span className="font-semibold">
                    {formatCurrency(item.unit_price * item.quantity)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Bill Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(displayTotals.subTotal)}</span>
            </div>

            {displayTotals.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-success">
                <span>
                  Discount
                  {bill.discount_type && bill.discount_value && (
                    <span className="text-muted-foreground ml-1">
                      ({bill.discount_type === 'percentage' ? `${bill.discount_value}%` : `₹${bill.discount_value}`})
                    </span>
                  )}
                </span>
                <span>-{formatCurrency(displayTotals.discountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">CGST (2.5%)</span>
              <span>{formatCurrency(displayTotals.cgstAmount)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SGST (2.5%)</span>
              <span>{formatCurrency(displayTotals.sgstAmount)}</span>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-success">{formatCurrency(displayTotals.finalAmount)}</span>
            </div>

            {bill.cover_count && bill.cover_count > 1 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Covers</span>
                <span>{bill.cover_count} persons</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Info */}
      {bill.settled_at && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Settled At</p>
                <p className="font-medium">
                  {format(new Date(bill.settled_at), 'dd MMM yyyy, hh:mm a')}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {bill.payment_method}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
