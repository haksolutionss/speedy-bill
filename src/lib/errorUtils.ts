/**
 * Parse Supabase error and return a user-friendly message
 */
export function parseSupabaseError(error: unknown, context?: {
  entityType?: 'section' | 'table' | 'category' | 'product';
  fieldName?: string;
}): string {
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Check for unique constraint violations
  if (errorMessage.includes('duplicate key value') || errorMessage.includes('23505')) {
    const entity = context?.entityType || 'record';
    const field = context?.fieldName || 'value';

    console.log("hello")

    // Parse specific constraint names for better messages
    if (errorMessage.includes('table_sections_name_unique')) {
      return 'A section with this name already exists';
    }
    if (errorMessage.includes('tables_number_section_unique')) {
      return 'A table with this number already exists in this section';
    }
    if (errorMessage.includes('categories_name_unique')) {
      return 'A category with this name already exists';
    }
    if (errorMessage.includes('products_code_unique')) {
      return 'A product with this code already exists';
    }
    if (errorMessage.includes('products_name_unique')) {
      return 'A product with this name already exists';
    }

    return `A ${entity} with this ${field} already exists`;
  }

  // Check for foreign key violations
  if (errorMessage.includes('foreign key constraint') || errorMessage.includes('23503')) {
    return 'This record is referenced by other data and cannot be modified';
  }

  // Check for not null violations
  if (errorMessage.includes('null value') || errorMessage.includes('23502')) {
    return 'A required field is missing';
  }

  // Return original message for other errors
  return errorMessage;
}
