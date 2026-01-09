import { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react';
import { useBillingStore } from '@/store/billingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Products() {
  const { products } = useBillingStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const categories = [...new Set(products.map(p => p.category))];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Manage your menu items</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map(cat => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Products Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Portions</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-center">GST</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map(product => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-muted-foreground">
                  {product.code}
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {product.portions.map(p => (
                      <span key={p.size} className="text-xs capitalize text-muted-foreground">
                        {p.size}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  ₹{product.portions[0].price}
                  {product.portions.length > 1 && '+'}
                </TableCell>
                <TableCell className="text-center text-sm text-muted-foreground">
                  {product.gstRate}%
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant="outline"
                    className={cn(
                      product.isActive 
                        ? "border-success/50 text-success" 
                        : "border-destructive/50 text-destructive"
                    )}
                  >
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No products found</p>
        </div>
      )}
    </div>
  );
}
