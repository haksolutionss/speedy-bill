/**
 * CSV Import/Export utilities for Products and Categories
 */

export interface CsvRowError {
  row: number;
  field: string;
  message: string;
}

export interface CsvImportResult<T> {
  valid: T[];
  errors: CsvRowError[];
  totalRows: number;
}

/**
 * Parse CSV string into array of objects
 */
export function parseCsv(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.every((v) => v.trim() === '')) continue; // skip empty rows
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line respecting quoted fields
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Convert array of objects to CSV string
 */
export function objectsToCsv(data: Record<string, unknown>[], headers: string[]): string {
  const headerLine = headers.join(',');
  const lines = data.map((row) =>
    headers
      .map((h) => {
        const val = row[h] ?? '';
        const str = String(val);
        // Escape fields containing commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\n');
}

/**
 * Trigger a CSV file download
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// ============ CATEGORY VALIDATION ============

export interface CategoryImportRow {
  name: string;
  display_order: number;
}

export function validateCategoryRows(
  rows: Record<string, string>[],
  existingNames: string[]
): CsvImportResult<CategoryImportRow> {
  const valid: CategoryImportRow[] = [];
  const errors: CsvRowError[] = [];
  const seenNames = new Set(existingNames.map((n) => n.toLowerCase()));

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 1-indexed + header row

    if (!row.name || row.name.trim() === '') {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
      return;
    }

    const name = row.name.trim();
    if (name.length > 100) {
      errors.push({ row: rowNum, field: 'name', message: 'Name must be under 100 characters' });
      return;
    }

    if (seenNames.has(name.toLowerCase())) {
      errors.push({ row: rowNum, field: 'name', message: `Duplicate category: "${name}"` });
      return;
    }

    const display_order = row.display_order ? parseInt(row.display_order, 10) : 0;
    if (isNaN(display_order)) {
      errors.push({ row: rowNum, field: 'display_order', message: 'Display order must be a number' });
      return;
    }

    seenNames.add(name.toLowerCase());
    valid.push({ name, display_order });
  });

  return { valid, errors, totalRows: rows.length };
}

// ============ PRODUCT VALIDATION ============

export interface ProductImportRow {
  name: string;
  code: string;
  category_name: string;
  category_id?: string;
  description: string;
  gst_rate: number;
  price: number;
  portion_size: string;
}

export function validateProductRows(
  rows: Record<string, string>[],
  existingCodes: string[],
  categoryMap: Map<string, string> // name -> id
): CsvImportResult<ProductImportRow> {
  const valid: ProductImportRow[] = [];
  const errors: CsvRowError[] = [];
  const seenCodes = new Set(existingCodes.map((c) => c.toLowerCase()));

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Name
    if (!row.name?.trim()) {
      errors.push({ row: rowNum, field: 'name', message: 'Name is required' });
      return;
    }

    // Code
    if (!row.code?.trim()) {
      errors.push({ row: rowNum, field: 'code', message: 'Code is required' });
      return;
    }
    const code = row.code.trim();
    if (seenCodes.has(code.toLowerCase())) {
      errors.push({ row: rowNum, field: 'code', message: `Duplicate code: "${code}"` });
      return;
    }

    // Category
    const catName = row.category?.trim() || '';
    if (!catName) {
      errors.push({ row: rowNum, field: 'category', message: 'Category is required' });
      return;
    }
    const categoryId = categoryMap.get(catName.toLowerCase());
    if (!categoryId) {
      errors.push({ row: rowNum, field: 'category', message: `Category not found: "${catName}"` });
      return;
    }

    // Price
    const price = parseFloat(row.price || '0');
    if (isNaN(price) || price < 0) {
      errors.push({ row: rowNum, field: 'price', message: 'Price must be a valid positive number' });
      return;
    }

    // GST Rate
    const gst_rate = parseFloat(row.gst_rate || '5');
    if (isNaN(gst_rate) || gst_rate < 0) {
      errors.push({ row: rowNum, field: 'gst_rate', message: 'GST rate must be a valid number' });
      return;
    }

    seenCodes.add(code.toLowerCase());
    valid.push({
      name: row.name.trim(),
      code,
      category_name: catName,
      category_id: categoryId,
      description: row.description?.trim() || '',
      gst_rate,
      price,
      portion_size: row.portion_size?.trim() || 'Regular',
    });
  });

  return { valid, errors, totalRows: rows.length };
}
