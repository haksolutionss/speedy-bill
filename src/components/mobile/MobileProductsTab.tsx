import { useState, useMemo, useCallback } from 'react';
import { Search, AlertCircle, MessageSquare, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGetProductsQuery, useGetCategoriesQuery } from '@/store/redux/api/billingApi';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';
import type { ProductWithPortions, DbProductPortion } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MobileProductsTabProps {
  onItemAdded?: () => void;
}

export function MobileProductsTab({ onItemAdded }: MobileProductsTabProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [portionModal, setPortionModal] = useState<ProductWithPortions | null>(null);
  const [quantityModal, setQuantityModal] = useState<{ product: ProductWithPortions; portion: DbProductPortion } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [noteValue, setNoteValue] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data: products = [], isLoading: productsLoading } = useGetProductsQuery();
  const { data: categories = [], isLoading: categoriesLoading } = useGetCategoriesQuery();
  const { addToCart, selectedTable, isParcelMode } = useUIStore();

  const isTableSelected = selectedTable || isParcelMode;

  // Check if current table/section is Parcel
  const isParcel = useMemo(() => {
    return selectedTable?.number?.match(/^P\d+$/i) || isParcelMode;
  }, [selectedTable?.number, isParcelMode]);

  // Get section-based price
  const getSectionPrice = useCallback((portion: DbProductPortion): number => {
    if (selectedTable?.section_id && portion.section_prices) {
      const sectionPrice = portion.section_prices[selectedTable.section_id];
      if (sectionPrice !== undefined && sectionPrice > 0) {
        return sectionPrice;
      }
    }
    return portion.price;
  }, [selectedTable?.section_id]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((p) => p.is_active);

    if (activeCategory) {
      filtered = filtered.filter((p) => p.category_id === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [products, activeCategory, search]);

  const handleProductTap = (product: ProductWithPortions) => {
    const activePortions = product.portions.filter((p) => p.is_active !== false);

    if (activePortions.length === 0) return;

    if (isParcel) {
      // For Parcel: Show portion selection first (if multiple portions)
      if (activePortions.length === 1) {
        // Single portion - go directly to quantity
        setQuantityModal({ product, portion: activePortions[0] });
        setQuantity(1);
        setNoteValue('');
        setShowNoteInput(false);
      } else {
        // Multiple portions - show portion selection
        setPortionModal(product);
      }
    } else {
      // For non-Parcel sections: Use section-based pricing, skip portion selection
      // Always use first active portion but apply section price
      const portion = activePortions[0];
      setQuantityModal({ product, portion });
      setQuantity(1);
      setNoteValue('');
      setShowNoteInput(false);
    }
  };

  const handlePortionSelect = (portion: DbProductPortion) => {
    if (!portionModal) return;
    setQuantityModal({ product: portionModal, portion });
    setPortionModal(null);
    setQuantity(1);
    setNoteValue('');
    setShowNoteInput(false);
  };

  const handleAddWithQuantity = () => {
    if (!quantityModal) return;
    const { product, portion } = quantityModal;

    // Add to cart with notes (trimmed, undefined if empty)
    const notes = noteValue.trim() || undefined;
    addToCart(product, portion.size, quantity, getSectionPrice(portion));

    // Reset state
    setQuantityModal(null);
    setQuantity(1);
    setNoteValue('');
    setShowNoteInput(false);
    onItemAdded?.();
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value >= 1) {
      setQuantity(value);
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  const isLoading = productsLoading || categoriesLoading;

  // Show disabled state if no table selected
  if (!isTableSelected) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Select a Table First</h3>
        <p className="text-sm text-muted-foreground">
          Please select a table or start a parcel order before adding products.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        <div className="h-11 bg-muted animate-pulse rounded-lg" />
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-20 bg-muted animate-pulse rounded-full shrink-0" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10 h-11"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
            className="shrink-0 h-9"
          >
            All
          </Button>
          {categories.filter((c) => c.is_active).map((category) => (
            <Button
              key={category.id}
              variant={activeCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category.id)}
              className="shrink-0 h-9"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto p-4 pb-16">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Search className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {filteredProducts.map((product) => {
              const basePrice = product.portions[0] ? getSectionPrice(product.portions[0]) : 0;
              const hasMultiplePortions = product.portions.filter((p) => p.is_active !== false).length > 1;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductTap(product)}
                  className="bg-card border border-border rounded-xl p-3 text-left transition-all active:scale-95 hover:border-primary/50"
                >
                  <div className="flex flex-col h-full">
                    <span className="text-xs text-muted-foreground mb-1">{product.code}</span>
                    <span className="font-medium text-sm line-clamp-2 flex-1">{product.name}</span>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-success font-semibold">
                        ₹{basePrice}
                        {hasMultiplePortions && isParcel && '+'}
                      </span>
                      {hasMultiplePortions && isParcel && (
                        <span className="text-xs text-muted-foreground">
                          {product.portions.filter((p) => p.is_active !== false).length} sizes
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Portion Selection Modal - Only for Parcel */}
      <Dialog open={!!portionModal} onOpenChange={() => setPortionModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{portionModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <p className="text-sm text-muted-foreground mb-3">Select portion size</p>
            {portionModal?.portions
              .filter((p) => p.is_active !== false)
              .map((portion) => (
                <Button
                  key={portion.id}
                  variant="outline"
                  className="w-full h-14 justify-between text-base"
                  onClick={() => handlePortionSelect(portion)}
                >
                  <span className="capitalize">{portion.size}</span>
                  <span className="text-success font-semibold">₹{getSectionPrice(portion)}</span>
                </Button>
              ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Quantity Modal */}
      <Dialog open={!!quantityModal} onOpenChange={() => setQuantityModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Cart</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Product Info */}
            <div className="text-center">
              <p className="font-medium">{quantityModal?.product.name}</p>
              <p className="text-sm text-muted-foreground capitalize">
                {quantityModal?.portion.size} - ₹{quantityModal?.portion && getSectionPrice(quantityModal.portion)}
              </p>
            </div>

            {/* Quantity Controls */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 text-xl"
                  onClick={decrementQuantity}
                >
                  -
                </Button>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-20 h-12 text-center text-2xl font-bold"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 text-xl"
                  onClick={incrementQuantity}
                >
                  +
                </Button>
              </div>
            </div>

            {/* Note Section */}
            <div className="space-y-2">
              {!showNoteInput ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowNoteInput(true)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Add notes (optional)
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Notes</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => {
                        setShowNoteInput(false);
                        setNoteValue('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="e.g., extra spicy, no onions"
                    className="bg-secondary"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddWithQuantity();
                      if (e.key === 'Escape') {
                        setShowNoteInput(false);
                        setNoteValue('');
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Show current note if exists */}
            {noteValue && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Note:</p>
                <p className="text-sm italic">"{noteValue}"</p>
              </div>
            )}

            {/* Total */}
            <div className="text-center pt-2 border-t">
              <p className="text-lg font-semibold text-success">
                Total: ₹{quantityModal?.portion && getSectionPrice(quantityModal.portion) * quantity}
              </p>
            </div>

            {/* Add Button */}
            <Button
              className="w-full h-12 text-base"
              onClick={handleAddWithQuantity}
            >
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}