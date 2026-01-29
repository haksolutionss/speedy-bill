import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Package, FolderPlus, Ruler } from 'lucide-react';
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
import ResponsiveModal from '@/components/ui/responsive-modal';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ProductForm, ProductFormData } from '@/components/products/ProductForm';
import { CategoryForm, CategoryFormData } from '@/components/products/CategoryForm';
import { PortionSizesManager } from '@/components/products/PortionSizesManager';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { QueryErrorHandler } from '@/components/common/QueryErrorHandler';
import { ProductTableSkeleton } from '@/components/common/skeletons';
import { EmptyState } from '@/components/common/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { DbCategory, ProductWithPortions } from '@/types/database';
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useGetTableSectionsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from '@/store/redux/api/billingApi';

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSizesModalOpen, setIsSizesModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithPortions | null>(null);
  const [editingCategory, setEditingCategory] = useState<DbCategory | null>(null);

  // Delete confirmation states
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  // RTK Query hooks
  const { data: products = [], isLoading: isLoadingProducts, error: productsError, refetch: refetchProducts } = useGetProductsQuery();
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError, refetch: refetchCategories } = useGetCategoriesQuery();
  const { data: tableSections = [] } = useGetTableSectionsQuery();

  // Get flat list of sections for the form
  const sections = useMemo(() => tableSections.map(s => ({
    id: s.id,
    name: s.name,
    display_order: s.display_order,
    is_active: s.is_active,
    created_at: s.created_at,
    updated_at: s.updated_at,
  })), [tableSections]);

  // Mutations
  const [createProduct, { isLoading: isCreatingProduct }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdatingProduct }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeletingProduct }] = useDeleteProductMutation();
  const [createCategory, { isLoading: isCreatingCategory }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: isUpdatingCategory }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeletingCategory }] = useDeleteCategoryMutation();

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Handlers
  const handleProductSubmit = async (data: ProductFormData) => {
    try {
      // Build section_prices object from sectionPrices array
      const portionsData = data.portions.map((p) => {
        const sectionPrices: Record<string, number> = {};
        p.sectionPrices?.forEach(sp => {
          if (sp.price !== undefined && sp.price > 0) {
            sectionPrices[sp.sectionId] = sp.price;
          }
        });

        return {
          id: p.id,
          size_id: p.size_id,
          price: p.price,
          section_prices: Object.keys(sectionPrices).length > 0 ? sectionPrices : undefined,
        };
      });

      if (editingProduct) {
        await updateProduct({
          id: editingProduct.id,
          product: {
            name: data.name,
            code: data.code,
            category_id: data.category_id,
            description: data.description,
            gst_rate: data.gst_rate,
          },
          portions: portionsData,
        }).unwrap();
      } else {
        await createProduct({
          product: {
            name: data.name,
            code: data.code,
            category_id: data.category_id,
            description: data.description,
            gst_rate: data.gst_rate,
          },
          portions: portionsData,
        }).unwrap();
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save product');
    }
  };

  const handleCategorySubmit = async (data: CategoryFormData) => {
    try {
      if (editingCategory) {
        await updateCategory({
          id: editingCategory.id,
          updates: data,
        }).unwrap();
      } else {
        await createCategory({ name: data.name, display_order: data.display_order }).unwrap();
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save category');
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    try {
      await deleteProduct(deleteProductId).unwrap();
      setDeleteProductId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete product');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    try {
      await deleteCategory(deleteCategoryId).unwrap();
      setDeleteCategoryId(null);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete category');
    }
  };

  const openEditProduct = (product: ProductWithPortions) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openEditCategory = (category: DbCategory) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const isLoading = isLoadingProducts || isLoadingCategories;
  const error = productsError || categoriesError;

  if (error) {
    return (
      <QueryErrorHandler
        error={error}
        onRetry={() => {
          refetchProducts();
          refetchCategories();
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-muted-foreground">Manage your menu items</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSizesModalOpen(true)}
              className="gap-2"
            >
              <Ruler className="h-4 w-4" />
              <span className="hidden sm:inline">Sizes</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="gap-2"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Category</span>
              <span className="sm:hidden">Category</span>
            </Button>
            <Button
              onClick={() => {
                setEditingProduct(null);
                setIsProductModalOpen(true);
              }}
              className="gap-2"
              disabled={categories.length === 0}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Product</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <ProductTableSkeleton />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FolderPlus}
            title="No categories yet"
            description="Create categories first to organize your products"
            action={
              <Button onClick={() => setIsCategoryModalOpen(true)} className="gap-2">
                <FolderPlus className="h-4 w-4" />
                Add Category
              </Button>
            }
          />
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-col items-start gap-4">
              <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="relative -mx-1">
                <div className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">

                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition',
                      selectedCategory === null
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    )}
                  >
                    All
                  </button>

                  {categories.map((cat) => (
                    <div key={cat.id} className="relative group">
                      <button
                        onClick={() => setSelectedCategory(cat.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition',
                          selectedCategory === cat.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        )}
                      >
                        {cat.name}
                      </button>

                      {/* Edit icon – overlay, not layout-breaking */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCategory(cat);
                        }}
                        className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-background border shadow"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}

                </div>
              </div>
            </div>

            {/* Products Table */}
            {filteredProducts.length === 0 ? (
              <EmptyState
                icon={searchQuery ? Search : Package}
                title={searchQuery ? 'No results found' : 'No products yet'}
                description={
                  searchQuery
                    ? `No products matching "${searchQuery}"`
                    : 'Add your first product to get started'
                }
                action={
                  !searchQuery && (
                    <Button onClick={() => setIsProductModalOpen(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  )
                }
              />
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Category</TableHead>
                      <TableHead className="hidden md:table-cell">Portions</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">GST</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="text-muted-foreground  text-xs">
                          {product.code}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {product.name}
                            <span className="sm:hidden block text-xs text-muted-foreground mt-0.5">
                              {product.category?.name || 'Uncategorized'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">{product.category?.name || 'Uncategorized'}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex gap-1 flex-wrap">
                            {product.portions.map((p) => (
                              <span key={p.size} className="text-xs capitalize text-muted-foreground">
                                {p.size}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{Number(product.portions[0]?.price || 0).toFixed(0)}
                          {product.portions.length > 1 && '+'}
                        </TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground hidden lg:table-cell">
                          {Number(product.gst_rate)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              product.is_active
                                ? 'border-success/50 text-success'
                                : 'border-destructive/50 text-destructive'
                            )}
                          >
                            {product.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEditProduct(product)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteProductId(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}

        {/* Product Modal */}
        <ResponsiveModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          title={editingProduct ? 'Edit Product' : 'Add Product'}
        >
          <ProductForm
            categories={categories}
            sections={sections}
            initialData={editingProduct}
            onSubmit={handleProductSubmit}
            isLoading={isCreatingProduct || isUpdatingProduct}
          />
        </ResponsiveModal>

        {/* Category Modal */}
        <ResponsiveModal
          isOpen={isCategoryModalOpen}
          onClose={() => {
            setIsCategoryModalOpen(false);
            setEditingCategory(null);
          }}
          title={editingCategory ? 'Edit Category' : 'Add Category'}
        >
          <CategoryForm
            initialData={editingCategory}
            onSubmit={handleCategorySubmit}
            isLoading={isCreatingCategory || isUpdatingCategory}
          />
        </ResponsiveModal>

        {/* Sizes Management Modal */}
        <ResponsiveModal
          isOpen={isSizesModalOpen}
          onClose={() => setIsSizesModalOpen(false)}
          title="Manage Portion Sizes"
        >
          <PortionSizesManager />
        </ResponsiveModal>

        {/* Delete Product Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteProductId}
          onClose={() => setDeleteProductId(null)}
          onConfirm={handleDeleteProduct}
          title="Delete Product"
          description="Are you sure you want to delete this product? This action can be undone by an administrator."
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeletingProduct}
        />

        {/* Delete Category Confirmation */}
        <ConfirmDialog
          isOpen={!!deleteCategoryId}
          onClose={() => setDeleteCategoryId(null)}
          onConfirm={handleDeleteCategory}
          title="Delete Category"
          description="Are you sure you want to delete this category? Products in this category will become uncategorized."
          confirmText="Delete"
          variant="destructive"
          isLoading={isDeletingCategory}
        />
      </div>
    </ErrorBoundary>
  );
}
