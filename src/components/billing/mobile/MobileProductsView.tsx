import { useState, useMemo } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUIStore } from '@/store/uiStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { ProductWithPortions, DbCategory, DbProductPortion } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface MobileProductsViewProps {
  products: ProductWithPortions[];
  isLoading: boolean;
}

export function MobileProductsView({ products, isLoading }: MobileProductsViewProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPortions | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<DbProductPortion | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  const { addToCart, selectedTable } = useUIStore();

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as DbCategory[];
    },
  });

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search || 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || p.category_id === activeCategory;
      return matchesSearch && matchesCategory && p.is_active;
    });
  }, [products, search, activeCategory]);

  // Get section-based price
  const getSectionPrice = (portion: DbProductPortion): number => {
    if (selectedTable?.section_id && portion.section_prices) {
      const sectionPrice = portion.section_prices[selectedTable.section_id];
      if (sectionPrice !== undefined && sectionPrice > 0) {
        return sectionPrice;
      }
    }
    return portion.price;
  };

  const handleProductClick = (product: ProductWithPortions) => {
    const activePortions = product.portions.filter(p => p.is_active !== false);
    
    if (activePortions.length === 1) {
      // Single portion - add directly
      addToCart(product, activePortions[0].size, 1);
    } else {
      // Multiple portions - show modal
      setSelectedProduct(product);
      setSelectedPortion(activePortions[0] || null);
      setQuantity(1);
    }
  };

  const handleAddToCart = () => {
    if (selectedProduct && selectedPortion) {
      addToCart(selectedProduct, selectedPortion.size, quantity);
      setSelectedProduct(null);
      setSelectedPortion(null);
      setQuantity(1);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading products...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="shrink-0 border-b border-border overflow-x-auto">
        <div className="flex px-2 py-2 gap-2 min-w-max">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
                activeCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredProducts.map(product => {
            const defaultPortion = product.portions[0];
            const price = defaultPortion ? getSectionPrice(defaultPortion) : 0;
            
            return (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-card border border-border rounded-lg p-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="text-xs text-muted-foreground mb-1">{product.code}</div>
                <div className="text-sm font-medium line-clamp-2 mb-2">{product.name}</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-success">₹{price}</span>
                  {product.portions.length > 1 && (
                    <span className="text-[10px] text-muted-foreground">
                      {product.portions.length} sizes
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No products found
          </div>
        )}
      </div>

      {/* Portion Selection Modal */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-[90vw] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              {/* Portion Selection */}
              <div className="grid grid-cols-2 gap-2">
                {selectedProduct.portions.filter(p => p.is_active !== false).map(portion => (
                  <button
                    key={portion.id}
                    onClick={() => setSelectedPortion(portion)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-colors",
                      selectedPortion?.id === portion.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="font-medium capitalize">{portion.size}</div>
                    <div className="text-success font-bold">₹{getSectionPrice(portion)}</div>
                  </button>
                ))}
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Add Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleAddToCart}
                disabled={!selectedPortion}
              >
                Add to Cart - ₹{selectedPortion ? getSectionPrice(selectedPortion) * quantity : 0}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
