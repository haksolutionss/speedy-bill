import { Minus, Plus, Trash2, MessageSquare } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function Cart() {
  const { cart, updateCartItemQuantity, removeFromCart, updateCartItemNotes } = useBillingStore();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  
  const handleStartEditNotes = (itemId: string, currentNotes?: string) => {
    setEditingNotes(itemId);
    setNoteValue(currentNotes || '');
  };
  
  const handleSaveNotes = (itemId: string) => {
    updateCartItemNotes(itemId, noteValue);
    setEditingNotes(null);
    setNoteValue('');
  };
  
  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
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
  
  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
      {cart.map((item, index) => (
        <div
          key={item.id}
          className={cn(
            "cart-item animate-slide-up",
            item.sentToKitchen ? "cart-item-sent" : "cart-item-pending"
          )}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{item.productCode}</span>
                  <span className="font-medium truncate">{item.productName}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="capitalize">{item.portion}</span>
                  <span>×</span>
                  <span className="font-mono">₹{item.unitPrice}</span>
                  {item.sentToKitchen && (
                    <span className="text-blue-400 font-medium">• KOT Sent</span>
                  )}
                </div>
                {item.notes && (
                  <p className="text-xs text-accent mt-1 italic">"{item.notes}"</p>
                )}
              </div>
              <span className="font-mono font-semibold text-success shrink-0">
                ₹{item.unitPrice * item.quantity}
              </span>
            </div>
            
            {/* Notes editing */}
            {editingNotes === item.id && (
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
                  className="h-7 w-7"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="font-mono w-8 text-center">{item.quantity}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartEditNotes(item.id, item.notes)}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeFromCart(item.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
