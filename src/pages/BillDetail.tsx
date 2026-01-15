import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EditViewBillingModule } from '@/components/billing/EditViewBillingModule';

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

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEditMode = searchParams.get('isEdit') === 'true';

  const [bill, setBill] = useState<BillData | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch bill data
  const fetchBill = async () => {
    if (!id) return;

    setIsLoading(true);
    try {
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .select('*')
        .eq('id', id)
        .single();

      if (billError) throw billError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', id);

      if (itemsError) throw itemsError;

      setBill(billData);
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching bill:', error);
      toast.error('Failed to load bill');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBill();
  }, [id]);

  const handleModeChange = (isEdit: boolean) => {
    setSearchParams({ isEdit: isEdit.toString() });
  };

  const handleBillUpdated = () => {
    fetchBill();
  };

  if (isLoading) {
    return (
      <div className="h-screen flex bg-background overflow-hidden">
        <div className="fixed w-[calc(100%_-_480px)] h-[calc(100vh_-_50px)] left-0 flex-1 flex flex-col border-r border-border min-w-0 overflow-hidden p-6">
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="fixed right-0 w-[480px] h-[calc(100vh_-_50px)] flex flex-col bg-card shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex-1 p-4 space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)]">
        <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Bill Not Found</h2>
        <p className="text-muted-foreground mb-4">The bill you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/history')}>
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <EditViewBillingModule
      bill={bill}
      initialItems={items}
      isEditMode={isEditMode}
      onModeChange={handleModeChange}
      onBillUpdated={handleBillUpdated}
    />
  );
}
