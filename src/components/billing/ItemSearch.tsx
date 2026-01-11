import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useBillingStore } from '@/store/billingStore';
import type { ProductWithPortions, DbProductPortion } from '@/types/database';
import { cn } from '@/lib/utils';

interface ItemSearchProps {
  onItemAdded?: () => void;
}

export function ItemSearch({ onItemAdded }: ItemSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductWithPortions[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPortionSelect, setShowPortionSelect] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPortions | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<DbProductPortion | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [step, setStep] = useState<'search' | 'portion' | 'quantity'>('search');

  const inputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { products, addToCart } = useBillingStore();

  // Search products
  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([]);
      return;
    }

    const searchLower = query.toLowerCase();
    const filtered = products
      .filter(p => p.is_active)
      .filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.code.toLowerCase().includes(searchLower)
      )
      .slice(0, 5);

    setSuggestions(filtered);
    setSelectedIndex(0);
  }, [query, products]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSelectProduct = useCallback((product: ProductWithPortions) => {
    setSelectedProduct(product);

    if (product.portions.length === 1) {
      // Single portion, go directly to quantity
      setSelectedPortion(product.portions[0]);
      setStep('quantity');
      setShowPortionSelect(false);
      setTimeout(() => quantityRef.current?.focus(), 50);
    } else {
      // Multiple portions, show selection
      setStep('portion');
      setShowPortionSelect(true);
      setSelectedIndex(0);
    }
  }, []);

  const handleSelectPortion = useCallback((portion: DbProductPortion) => {
    setSelectedPortion(portion);
    setStep('quantity');
    setShowPortionSelect(false);
    setTimeout(() => quantityRef.current?.focus(), 50);
  }, []);

  const handleAddItem = useCallback(() => {
    if (!selectedProduct || !selectedPortion) return;

    const qty = parseInt(quantity) || 1;
    addToCart(selectedProduct, selectedPortion.size, qty);

    // Reset state
    setQuery('');
    setSuggestions([]);
    setSelectedProduct(null);
    setSelectedPortion(null);
    setQuantity('1');
    setStep('search');
    setShowPortionSelect(false);

    inputRef.current?.focus();
    onItemAdded?.();
  }, [selectedProduct, selectedPortion, quantity, addToCart, onItemAdded]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (step === 'search') {
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
        setQuery('');
        setSuggestions([]);
      }
    } else if (step === 'portion' && selectedProduct) {
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
        setStep('search');
        setShowPortionSelect(false);
        setSelectedProduct(null);
        inputRef.current?.focus();
      }
    }
  };

  const handleQuantityKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddItem();
    } else if (e.key === 'Escape') {
      setStep('search');
      setSelectedProduct(null);
      setSelectedPortion(null);
      setQuantity('1');
      inputRef.current?.focus();
    }
  };

  // Handle global keyboard for portion selection (when input is disabled)
  useEffect(() => {
    if (step !== 'portion' || !selectedProduct) return;

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
        setStep('search');
        setShowPortionSelect(false);
        setSelectedProduct(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step, selectedProduct, selectedIndex, handleSelectPortion]);

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search items by name or code..."
          className="pl-10 bg-secondary border-border focus:border-primary"
          disabled={step !== 'search'}
        />
      </div>

      {/* Suggestions Dropdown */}
      {suggestions.length > 0 && step === 'search' && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up">
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
                <span className=" text-xs text-muted-foreground w-10">{product.code}</span>
                <span className="font-medium">{product.name}</span>
                {product.portions.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    ({product.portions.map(p => p.size).join('/')})
                  </span>
                )}
              </div>
              <span className=" text-sm text-success">
                ₹{product.portions[0]?.price || 0}
                {product.portions.length > 1 && '+'}
              </span>
            </div>
          ))}
          <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between border-t border-border">
            <span><kbd className="kbd">↑↓</kbd> Navigate</span>
            <span><kbd className="kbd">Enter</kbd> Select</span>
            <span><kbd className="kbd">Esc</kbd> Cancel</span>
          </div>
        </div>
      )}

      {/* Portion Selection */}
      {showPortionSelect && selectedProduct && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up">
          <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-accent">{selectedProduct.name}</span>
              <span className="text-xs text-muted-foreground ml-2">Select portion</span>
            </div>
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
              <span className=" text-sm text-success">₹{portion.price}</span>
            </div>
          ))}
          <div className="px-3 py-2 bg-muted/30 text-xs text-muted-foreground flex items-center justify-between border-t border-border">
            <span><kbd className="kbd">↑↓</kbd> Navigate</span>
            <span><kbd className="kbd">Enter</kbd> Select</span>
            <span><kbd className="kbd">Esc</kbd> Cancel</span>
          </div>
        </div>
      )}

      {/* Quantity Input */}
      {step === 'quantity' && selectedProduct && selectedPortion && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up p-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="font-medium">{selectedProduct.name}</span>
              <span className="text-muted-foreground ml-2 capitalize">({selectedPortion.size})</span>
            </div>
            <span className=" text-success">₹{selectedPortion.price}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Quantity</label>
              <Input
                ref={quantityRef}
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                onKeyDown={handleQuantityKeyDown}
                className="bg-secondary  text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
              <div className="h-10 flex items-center justify-center bg-muted rounded-md  text-success">
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

      {/* Empty State */}
      {query.trim() !== '' && suggestions.length === 0 && step === 'search' && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg p-4 text-center text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No items found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
