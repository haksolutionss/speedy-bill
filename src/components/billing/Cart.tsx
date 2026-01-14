import { Minus, Plus, Trash2, MessageSquare, Lock } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Cart() {
  const { cart, updateCartItem, removeFromCart } = useUIStore();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const handleStartEditNotes = (itemId: string, currentNotes?: string, isSent?: boolean) => {
    // Prevent editing notes for items sent to kitchen
    if (isSent) return;
    
    setEditingNotes(itemId);
    setNoteValue(currentNotes || '');
  };

  const handleSaveNotes = (itemId: string) => {
    updateCartItem(itemId, { notes: noteValue });
    setEditingNotes(null);
    setNoteValue('');
  };

  const handleQuantityChange = (itemId: string, newQuantity: number, isSent: boolean, currentQuantity: number, printedQuantity: number) => {
    if (isSent) {
      // For sent items, only allow increasing quantity
      if (newQuantity > printedQuantity) {
        updateCartItem(itemId, { quantity: newQuantity });
      }
      // Prevent decreasing below printed quantity
      return;
    }
    
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, { quantity: newQuantity });
    }
  };

  const handleRemove = (itemId: string, isSent: boolean) => {
    // Prevent removal of items sent to kitchen
    if (isSent) return;
    removeFromCart(itemId);
  };

  // Separate items by KOT status
  const sentItems = cart.filter(item => item.sentToKitchen);
  const pendingItems = cart.filter(item => !item.sentToKitchen);

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 min-h-0">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <p className="text-sm">Cart is empty</p>
        <p className="text-xs mt-1">Search and add items to get started</p>
      </div>
    );
  }

  const renderItem = (item: typeof cart[0], index: number) => {
    const isSent = item.sentToKitchen;
    const hasAdditionalQty = isSent && item.quantity > item.printedQuantity;
    const additionalQty = item.quantity - item.printedQuantity;

    return (
      <div
        key={item.id}
        className={cn(
          "cart-item animate-slide-up",
          isSent ? "cart-item-sent opacity-80" : "cart-item-pending"
        )}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{item.productCode}</span>
                <span className="font-medium truncate">{item.productName}</span>
                {isSent && (
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
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="capitalize">{item.portion}</span>
                <span>×</span>
                <span className="">₹{item.unitPrice}</span>
              </div>
              {item.notes && (
                <p className="text-xs text-accent mt-1 italic">"{item.notes}"</p>
              )}
              {hasAdditionalQty && (
                <p className="text-xs text-success mt-1">
                  +{additionalQty} new (will be printed in next KOT)
                </p>
              )}
            </div>
            <span className="font-semibold text-success shrink-0">
              ₹{item.unitPrice * item.quantity}
            </span>
          </div>

          {/* Notes editing - only for pending items */}
          {editingNotes === item.id && !isSent && (
            <div className="mt-2 flex items-center gap-2">
              <Input
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                placeholder="Add notes (e.g., extra spicy)"
                className="text-xs h-8 bg-secondary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveNotes(item.id);
                  if (e.key === 'Escape') setEditingNotes(null);
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                onClick={() => handleSaveNotes(item.id)}
              >
                Save
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-7 w-7", isSent && "opacity-50")}
                onClick={() => handleQuantityChange(
                  item.id, 
                  item.quantity - 1, 
                  isSent, 
                  item.quantity,
                  item.printedQuantity
                )}
                disabled={isSent && item.quantity <= item.printedQuantity}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center">{item.quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => handleQuantityChange(
                  item.id, 
                  item.quantity + 1, 
                  isSent, 
                  item.quantity,
                  item.printedQuantity
                )}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7",
                  isSent 
                    ? "text-muted-foreground/50 cursor-not-allowed" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleStartEditNotes(item.id, item.notes, isSent)}
                disabled={isSent}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7",
                  isSent 
                    ? "text-muted-foreground/50 cursor-not-allowed" 
                    : "text-muted-foreground hover:text-destructive"
                )}
                onClick={() => handleRemove(item.id, isSent)}
                disabled={isSent}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 min-h-0">
      {/* Sent to Kitchen Section */}
      {sentItems.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Sent to Kitchen ({sentItems.length})
          </p>
          <div className="space-y-2">
            {sentItems.map((item, index) => renderItem(item, index))}
          </div>
        </div>
      )}

      {/* Pending Section */}
      {pendingItems.length > 0 && (
        <div>
          {sentItems.length > 0 && (
            <p className="text-xs text-muted-foreground mb-2 mt-4">
              Pending ({pendingItems.length})
            </p>
          )}
          <div className="space-y-2">
            {pendingItems.map((item, index) => renderItem(item, sentItems.length + index))}
          </div>
        </div>
      )}
    </div>
  );
}
