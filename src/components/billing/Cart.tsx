import { Minus, Plus, Trash2, MessageSquare, Lock } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Cart() {
  const { cart, updateCartItem, removeFromCart } = useUIStore();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [focusedItemIndex, setFocusedItemIndex] = useState<number>(-1);
  
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleStartEditNotes = (itemId: string, currentNotes?: string, isSent?: boolean) => {
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
      if (newQuantity > printedQuantity) {
        updateCartItem(itemId, { quantity: newQuantity });
      }
      return;
    }
    
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateCartItem(itemId, { quantity: newQuantity });
    }
  };

  const handleRemove = (itemId: string, isSent: boolean) => {
    if (isSent) return;
    removeFromCart(itemId);
  };

  // Keyboard navigation for cart items
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement || 
      e.target instanceof HTMLTextAreaElement ||
      cart.length === 0
    ) {
      return;
    }

    const currentItem = focusedItemIndex >= 0 ? cart[focusedItemIndex] : null;

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
          if (focusedItemIndex < cart.length - 1) {
            setFocusedItemIndex(focusedItemIndex + 1);
            itemRefs.current.get(focusedItemIndex + 1)?.scrollIntoView({ block: 'nearest' });
          }
        }
        break;
      case 'ArrowLeft':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          if (!currentItem.sentToKitchen || currentItem.quantity > currentItem.printedQuantity) {
            handleQuantityChange(
              currentItem.id,
              currentItem.quantity - 1,
              currentItem.sentToKitchen,
              currentItem.quantity,
              currentItem.printedQuantity
            );
          }
        }
        break;
      case 'ArrowRight':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          handleQuantityChange(
            currentItem.id,
            currentItem.quantity + 1,
            currentItem.sentToKitchen,
            currentItem.quantity,
            currentItem.printedQuantity
          );
        }
        break;
      case 'Delete':
      case 'Backspace':
        if ((e.ctrlKey || e.metaKey) && currentItem && focusedItemIndex >= 0) {
          e.preventDefault();
          if (!currentItem.sentToKitchen) {
            handleRemove(currentItem.id, currentItem.sentToKitchen);
            // Adjust focus after deletion
            if (focusedItemIndex >= cart.length - 1) {
              setFocusedItemIndex(Math.max(0, cart.length - 2));
            }
          }
        }
        break;
    }
  }, [focusedItemIndex, cart, updateCartItem, removeFromCart]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset focused item when cart changes
  useEffect(() => {
    if (focusedItemIndex >= cart.length) {
      setFocusedItemIndex(cart.length - 1);
    }
  }, [cart.length, focusedItemIndex]);

  // Store ref for each cart item
  const setItemRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) {
      itemRefs.current.set(index, el);
    } else {
      itemRefs.current.delete(index);
    }
  }, []);

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

  const renderItem = (item: typeof cart[0], index: number, globalIndex: number) => {
    const isSent = item.sentToKitchen;
    const hasAdditionalQty = isSent && item.quantity > item.printedQuantity;
    const additionalQty = item.quantity - item.printedQuantity;
    const isFocused = focusedItemIndex === globalIndex;

    return (
      <div
        key={item.id}
        ref={(el) => setItemRef(globalIndex, el)}
        tabIndex={0}
        onClick={() => setFocusedItemIndex(globalIndex)}
        onFocus={() => setFocusedItemIndex(globalIndex)}
        className={cn(
          "cart-item animate-slide-up outline-none",
          isSent ? "cart-item-sent opacity-80" : "cart-item-pending",
          isFocused && "cart-item-focused"
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
                className={cn(
                  "h-7 w-7 focus-visible:ring-2 focus-visible:ring-accent",
                  isSent && "opacity-50"
                )}
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
                className="h-7 w-7 focus-visible:ring-2 focus-visible:ring-accent"
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
                  "h-7 w-7 focus-visible:ring-2 focus-visible:ring-accent",
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
                  "h-7 w-7 focus-visible:ring-2 focus-visible:ring-accent",
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

  let globalIndex = 0;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-3 min-h-0" ref={containerRef}>
      {/* Keyboard hints */}
      <div className="text-xs text-muted-foreground/70 flex items-center gap-3 pb-2 border-b border-border">
        <span><kbd className="kbd text-[10px]">Ctrl+↑↓</kbd> Navigate</span>
        <span><kbd className="kbd text-[10px]">Ctrl+←→</kbd> Qty</span>
        <span><kbd className="kbd text-[10px]">Ctrl+Del</kbd> Remove</span>
      </div>

      {/* Sent to Kitchen Section */}
      {sentItems.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Sent to Kitchen ({sentItems.length})
          </p>
          <div className="space-y-2">
            {sentItems.map((item, index) => {
              const result = renderItem(item, index, globalIndex);
              globalIndex++;
              return result;
            })}
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
            {pendingItems.map((item, index) => {
              const result = renderItem(item, index, globalIndex);
              globalIndex++;
              return result;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
