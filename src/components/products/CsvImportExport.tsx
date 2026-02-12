import { useState, useRef, useCallback } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  parseCsv,
  objectsToCsv,
  downloadCsv,
  validateCategoryRows,
  validateProductRows,
  type CsvRowError,
  type CategoryImportRow,
  type ProductImportRow,
} from '@/lib/csvUtils';
import type { DbCategory, ProductWithPortions } from '@/types/database';

interface CsvImportExportProps {
  products: ProductWithPortions[];
  categories: DbCategory[];
  portionSizes: { id: string; name: string }[];
  onImportComplete: () => void;
}

const BATCH_SIZE = 50;

type ImportMode = 'products' | 'categories';
type ImportState = 'idle' | 'validating' | 'preview' | 'importing' | 'done' | 'error';

export function CsvImportExport({
  products,
  categories,
  portionSizes,
  onImportComplete,
}: CsvImportExportProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('products');
  const [importState, setImportState] = useState<ImportState>('idle');
  const [errors, setErrors] = useState<CsvRowError[]>([]);
  const [validCategories, setValidCategories] = useState<CategoryImportRow[]>([]);
  const [validProducts, setValidProducts] = useState<ProductImportRow[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setImportState('idle');
    setErrors([]);
    setValidCategories([]);
    setValidProducts([]);
    setProgress({ current: 0, total: 0 });
    setTotalRows(0);
    if (fileRef.current) fileRef.current.value = '';
  }, []);

  // ============ EXPORT ============
  const handleExportProducts = () => {
    const data = products.map((p) => ({
      code: p.code,
      name: p.name,
      category: p.category?.name || '',
      description: p.description || '',
      gst_rate: p.gst_rate,
      price: p.portions[0]?.price || 0,
      portion_size: p.portions[0]?.size || 'Regular',
    }));
    const csv = objectsToCsv(data, ['code', 'name', 'category', 'description', 'gst_rate', 'price', 'portion_size']);
    downloadCsv(csv, `products_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${data.length} products`);
  };

  const handleExportCategories = () => {
    const data = categories.map((c) => ({
      name: c.name,
      display_order: c.display_order,
    }));
    const csv = objectsToCsv(data, ['name', 'display_order']);
    downloadCsv(csv, `categories_${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success(`Exported ${data.length} categories`);
  };

  // ============ IMPORT: FILE SELECT ============
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setImportState('validating');

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length === 0) {
        toast.error('CSV file is empty or has no data rows');
        setImportState('idle');
        return;
      }

      setTotalRows(rows.length);

      if (importMode === 'categories') {
        const existingNames = categories.map((c) => c.name);
        const result = validateCategoryRows(rows, existingNames);
        setValidCategories(result.valid);
        setErrors(result.errors);
      } else {
        const existingCodes = products.map((p) => p.code);
        const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
        const result = validateProductRows(rows, existingCodes, categoryMap);
        setValidProducts(result.valid);
        setErrors(result.errors);
      }

      setImportState('preview');
    } catch {
      toast.error('Failed to parse CSV file');
      setImportState('idle');
    }
  };

  // ============ IMPORT: EXECUTE ============
  const handleImport = async () => {
    setImportState('importing');

    try {
      if (importMode === 'categories') {
        await importCategories();
      } else {
        await importProducts();
      }

      setImportState('done');
      onImportComplete();
      toast.success(
        `Imported ${importMode === 'categories' ? validCategories.length : validProducts.length} ${importMode}`
      );
    } catch (err: any) {
      toast.error(err?.message || 'Import failed');
      setImportState('error');
    }
  };

  const importCategories = async () => {
    const total = validCategories.length;
    setProgress({ current: 0, total });

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = validCategories.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('categories').insert(
        batch.map((c) => ({ name: c.name, display_order: c.display_order }))
      );
      if (error) throw error;
      setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
    }
  };

  const importProducts = async () => {
    const total = validProducts.length;
    setProgress({ current: 0, total });

    // Get the default portion size
    const defaultSize = portionSizes.find((s) => s.name.toLowerCase() === 'regular') || portionSizes[0];

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = validProducts.slice(i, i + BATCH_SIZE);

      for (const product of batch) {
        // Find matching portion size
        const sizeMatch = portionSizes.find(
          (s) => s.name.toLowerCase() === product.portion_size.toLowerCase()
        ) || defaultSize;

        const { data: newProduct, error: prodError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            code: product.code,
            category_id: product.category_id!,
            description: product.description || null,
            gst_rate: product.gst_rate,
          })
          .select()
          .single();

        if (prodError) throw prodError;

        if (sizeMatch) {
          const { error: portionError } = await supabase.from('product_portions').insert({
            product_id: newProduct.id,
            size_id: sizeMatch.id,
            price: product.price,
          });
          if (portionError) throw portionError;
        }
      }

      setProgress({ current: Math.min(i + BATCH_SIZE, total), total });
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <>
      {/* Export Buttons */}
      <Button variant="outline" size="sm" onClick={handleExportProducts} className="gap-2">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export Products</span>
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCategories} className="gap-2">
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">Export Categories</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetState();
          setIsModalOpen(true);
        }}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        <span className="hidden sm:inline">Import CSV</span>
      </Button>

      {/* Import Modal */}
      <ResponsiveModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetState();
        }}
        title="Import from CSV"
      >
        <div className="space-y-4">
          {/* Mode Selection */}
          {importState === 'idle' && (
            <>
              <div className="flex gap-2">
                <Button
                  variant={importMode === 'products' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('products')}
                >
                  Products
                </Button>
                <Button
                  variant={importMode === 'categories' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setImportMode('categories')}
                >
                  Categories
                </Button>
              </div>

              <div className="border border-dashed border-border rounded-lg p-6 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  {importMode === 'products'
                    ? 'Required columns: code, name, category, price, gst_rate, portion_size, description'
                    : 'Required columns: name, display_order'}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button onClick={() => fileRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Select CSV File
                </Button>
              </div>
            </>
          )}

          {/* Validating */}
          {importState === 'validating' && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Validating rows…</span>
            </div>
          )}

          {/* Preview */}
          {importState === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-success border-success/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {importMode === 'categories' ? validCategories.length : validProducts.length} valid
                </Badge>
                {errors.length > 0 && (
                  <Badge variant="outline" className="text-destructive border-destructive/30">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {errors.length} errors
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">of {totalRows} rows</span>
              </div>

              {/* Error List */}
              {errors.length > 0 && (
                <div className="max-h-40 overflow-y-auto border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                  <p className="text-xs font-medium text-destructive mb-2">Errors (these rows will be skipped):</p>
                  {errors.slice(0, 20).map((err, i) => (
                    <p key={i} className="text-xs text-destructive/80">
                      Row {err.row}: <strong>{err.field}</strong> – {err.message}
                    </p>
                  ))}
                  {errors.length > 20 && (
                    <p className="text-xs text-destructive/60 mt-1">…and {errors.length - 20} more</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetState}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={
                    (importMode === 'categories' && validCategories.length === 0) ||
                    (importMode === 'products' && validProducts.length === 0)
                  }
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import {importMode === 'categories' ? validCategories.length : validProducts.length} rows
                </Button>
              </div>
            </div>
          )}

          {/* Importing Progress */}
          {importState === 'importing' && (
            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">
                  Importing… {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Done */}
          {importState === 'done' && (
            <div className="text-center py-6 space-y-3">
              <CheckCircle className="h-10 w-10 mx-auto text-success" />
              <p className="font-medium">Import Complete!</p>
              <Button
                variant="outline"
                onClick={() => {
                  setIsModalOpen(false);
                  resetState();
                }}
              >
                Close
              </Button>
            </div>
          )}

          {/* Error */}
          {importState === 'error' && (
            <div className="text-center py-6 space-y-3">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
              <p className="font-medium text-destructive">Import Failed</p>
              <p className="text-sm text-muted-foreground">Some rows may have been imported. Please check your data.</p>
              <Button variant="outline" onClick={resetState}>
                Try Again
              </Button>
            </div>
          )}
        </div>
      </ResponsiveModal>
    </>
  );
}
