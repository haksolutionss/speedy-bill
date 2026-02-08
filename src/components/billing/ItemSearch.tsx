import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUIStore } from '@/store/uiStore';
import { useGetProductsQuery, useGetCategoriesQuery } from '@/store/redux/api/billingApi';
import type { ProductWithPortions, DbProductPortion } from '@/types/database';
import { cn } from '@/lib/utils';
import { PriceInputModal } from './PriceInputModal';

// Category name that triggers price input flow
const CHANGEABLE_CATEGORY_NAME = 'changeable';

interface ItemSearchProps {
  onItemAdded?: () => void;
}

export interface ItemSearchRef {
  focus: () => void;
}

export const ItemSearch = forwardRef<ItemSearchRef, ItemSearchProps>(({ onItemAdded }, ref) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ProductWithPortions[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showPortionSelect, setShowPortionSelect] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPortions | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<DbProductPortion | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [step, setStep] = useState<'search' | 'price' | 'portion' | 'quantity'>('search');
  // Flag to prevent Enter key event from bubbling to portion selection
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Custom price for changeable items
  const [customPrice, setCustomPrice] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { addToCart, selectedTable, isParcelMode } = useUIStore();
  const { data: products = [] } = useGetProductsQuery();
  const { data: categories = [] } = useGetCategoriesQuery();

  // Check if current table/section is Parcel (consistent with mobile component)
  const isParcel = useMemo(() => {
    return selectedTable?.number?.match(/^P\d+$/i) || isParcelMode;
  }, [selectedTable?.number, isParcelMode]);

  // Check if a product belongs to changeable category
  const isChangeableProduct = useCallback((product: ProductWithPortions): boolean => {
    const category = categories.find(c => c.id === product.category_id);
    return category?.name.toLowerCase() === CHANGEABLE_CATEGORY_NAME;
  }, [categories]);

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    }
  }));

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

  // Helper to get section-based price
  const getSectionPrice = useCallback((portion: DbProductPortion): number => {
    if (selectedTable?.section_id && portion.section_prices) {
      const sectionPrice = portion.section_prices[selectedTable.section_id];
      if (sectionPrice !== undefined && sectionPrice > 0) {
        return sectionPrice;
      }
    }
    return portion.price;
  }, [selectedTable?.section_id]);

  const handleSelectProduct = useCallback((product: ProductWithPortions) => {
    setSelectedProduct(product);
    setCustomPrice(null); // Reset custom price

    if (!product.portions || product.portions.length === 0) {
      return;
    }

    const activePortions = product.portions.filter(p => p.is_active !== false);

    // Check if this is a changeable category product
    if (isChangeableProduct(product)) {
      // For changeable products: show price input first
      setSelectedPortion(activePortions[0]);
      setStep('price');
      return;
    }

    if (isParcel) {
      // For Parcel: Show portion selection first (if multiple portions)
      if (activePortions.length === 1) {
        // Single portion - go directly to quantity
        setSelectedPortion(activePortions[0]);
        setStep('quantity');
        setShowPortionSelect(false);
        setTimeout(() => quantityRef.current?.focus(), 50);
      } else {
        // Multiple portions - show portion selection
        setStep('portion');
        setShowPortionSelect(true);
        setSelectedIndex(0);
      }
    } else {
      // For non-Parcel sections: Use section-based pricing, skip portion selection
      // Always use first active portion but apply section price
      const portion = activePortions[0];
      setSelectedPortion(portion);
      setStep('quantity');
      setShowPortionSelect(false);
      setTimeout(() => quantityRef.current?.focus(), 50);
    }
  }, [isParcel, isChangeableProduct]);

  const handlePriceConfirm = useCallback((price: number) => {
    setCustomPrice(price);
    setShowPortionSelect(false); // Ensure portion select is closed
    setStep('quantity');
    setTimeout(() => quantityRef.current?.focus(), 50);
  }, []);

  const handleSelectPortion = useCallback((portion: DbProductPortion) => {
    setSelectedPortion(portion);
    setStep('quantity');
    setShowPortionSelect(false);
    setTimeout(() => {
      quantityRef.current?.focus();
    }, 50);
  }, []);

  const handleAddItem = useCallback(() => {

    if (!selectedProduct || !selectedPortion) {
      console.error('[ItemSearch] Cannot add item - missing product or portion');
      return;
    }

    const qty = parseInt(quantity) || 1;
    const isCustomPriceItem = customPrice !== null && customPrice > 0;
    const finalPrice = isCustomPriceItem ? customPrice : getSectionPrice(selectedPortion);

    addToCart(selectedProduct, selectedPortion.size, qty, finalPrice, isCustomPriceItem);

    // Reset state
    setQuery('');
    setSuggestions([]);
    setSelectedProduct(null);
    setSelectedPortion(null);
    setQuantity('1');
    setStep('search');
    setShowPortionSelect(false);
    setCustomPrice(null);

    inputRef.current?.focus();
    onItemAdded?.();
  }, [selectedProduct, selectedPortion, quantity, addToCart, onItemAdded, getSectionPrice, customPrice]);

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
        e.stopPropagation();
        // Set transitioning flag to prevent global listener from catching this event
        setIsTransitioning(true);
        handleSelectProduct(suggestions[selectedIndex]);
        // Clear flag after a short delay
        setTimeout(() => setIsTransitioning(false), 100);
      } else if (e.key === 'Escape') {
        setQuery('');
        setSuggestions([]);
      }
    } else if (step === 'portion' && selectedProduct) {
      const activePortions = selectedProduct.portions.filter(p => p.is_active !== false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, activePortions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectPortion(activePortions[selectedIndex]);
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
      // Focus back to search input after adding item
      setTimeout(() => inputRef.current?.focus(), 50);
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
      // Skip if we're still transitioning from product selection
      if (isTransitioning) return;

      const activePortions = selectedProduct.portions.filter(p => p.is_active !== false);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, activePortions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectPortion(activePortions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setStep('search');
        setShowPortionSelect(false);
        setSelectedProduct(null);
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [step, selectedProduct, selectedIndex, handleSelectPortion, isTransitioning]);

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
                ₹{product.portions[0] ? getSectionPrice(product.portions[0]) : 0}
                {product.portions.length > 1 && isParcel && '+'}
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

      {/* Portion Selection - Only show for Parcel mode */}
      {isParcel && showPortionSelect && selectedProduct && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50 animate-slide-up">
          <div className="px-3 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-accent">{selectedProduct.name}</span>
              <span className="text-xs text-muted-foreground ml-2">Select portion</span>
            </div>
          </div>
          {selectedProduct.portions.filter(p => p.is_active !== false).map((portion, index) => (
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
              <span className=" text-sm text-success">₹{getSectionPrice(portion)}</span>
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
            <span className="text-success">
              ₹{customPrice ?? getSectionPrice(selectedPortion)}
              {customPrice && <span className="text-xs text-muted-foreground ml-1">(custom)</span>}
            </span>
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
                className="bg-secondary text-center"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Amount</label>
              <div className="h-10 flex items-center justify-center bg-muted rounded-md text-success">
                ₹{(customPrice ?? getSectionPrice(selectedPortion)) * (parseInt(quantity) || 1)}
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

      {/* Price Input Modal for Changeable Category */}
      <PriceInputModal
        open={step === 'price' && !!selectedProduct}
        onOpenChange={(open) => {
          if (!open && step === 'price') {
            // Only reset if user cancelled (not if transitioning to quantity)
            setStep('search');
            setSelectedProduct(null);
            setSelectedPortion(null);
            setCustomPrice(null);
            setShowPortionSelect(false);
          }
        }}
        productName={selectedProduct?.name || ''}
        onPriceConfirm={handlePriceConfirm}
        defaultPrice={selectedPortion ? getSectionPrice(selectedPortion) : 0}
      />
    </div>
  );
});

ItemSearch.displayName = 'ItemSearch';