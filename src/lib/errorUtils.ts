/**
 * Extract error message from various error formats (Supabase, RTK Query, etc.)
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  // Handle string errors
  if (typeof error === 'string') return error;
  
  // Handle Error objects
  if (error instanceof Error) return error.message;
  
  // Handle RTK Query error format { message: string }
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    
    // RTK Query format
    if (typeof errorObj.message === 'string') return errorObj.message;
    
    // Supabase error format
    if (typeof errorObj.error === 'string') return errorObj.error;
    if (typeof errorObj.error_description === 'string') return errorObj.error_description;
    
    // Nested data format
    if (errorObj.data && typeof errorObj.data === 'object') {
      const data = errorObj.data as Record<string, unknown>;
      if (typeof data.message === 'string') return data.message;
    }
  }
  
  // Fallback - try to stringify but avoid [object Object]
  try {
    const stringified = JSON.stringify(error);
    if (stringified !== '{}') return stringified;
  } catch {
    // Ignore stringify errors
  }
  
  return 'An error occurred';
}

/**
 * Parse Supabase error and return a user-friendly message
 */
export function parseSupabaseError(error: unknown, context?: {
  entityType?: 'section' | 'table' | 'category' | 'product';
  fieldName?: string;
}): string {
  const errorMessage = getErrorMessage(error);
  
  // Check for unique constraint violations
  if (errorMessage.includes('duplicate key value') || errorMessage.includes('23505')) {
    const entity = context?.entityType || 'record';
    const field = context?.fieldName || 'value';
    
    // Parse specific constraint names for better messages
    if (errorMessage.includes('table_sections_name_unique')) {
      return 'A section with this name already exists';
    }
    if (errorMessage.includes('tables_number_section_unique') || errorMessage.includes('tables_section_id_number_key')) {
      return 'A table with this number already exists in this section';
    }
    if (errorMessage.includes('tables_number_key')) {
      return 'A table with this number already exists';
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
