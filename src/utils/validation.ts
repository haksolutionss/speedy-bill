// Validation utilities for business settings

export interface ValidationError {
    field: string;
    message: string;
}

export interface BusinessValidationResult {
    isValid: boolean;
    errors: ValidationError[];
}

export const validateBusinessSettings = (business: {
    name: string;
    phone: string;
    email: string;
    gstNumber: string;
    address: string;
}): BusinessValidationResult => {
    const errors: ValidationError[] = [];

    // Restaurant Name validation
    if (!business.name.trim()) {
        errors.push({ field: 'name', message: 'Restaurant name is required' });
    } else if (business.name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Restaurant name must be at least 2 characters' });
    } else if (business.name.length > 100) {
        errors.push({ field: 'name', message: 'Restaurant name must not exceed 100 characters' });
    }

    // Phone validation
    if (!business.phone.trim()) {
        errors.push({ field: 'phone', message: 'Phone number is required' });
    } else {
        // Check if it contains any non-numeric characters (except +, -, spaces, and parentheses)
        const phoneRegex = /^[\d\s\-+()]+$/;
        if (!phoneRegex.test(business.phone)) {
            errors.push({ field: 'phone', message: 'Phone number can only contain digits and +, -, (), spaces' });
        } else {
            // Remove all non-numeric characters for length validation
            const phoneDigits = business.phone.replace(/\D/g, '');
            if (phoneDigits.length < 10) {
                errors.push({ field: 'phone', message: 'Phone number must be at least 10 digits' });
            } else if (phoneDigits.length > 10) {
                errors.push({ field: 'phone', message: 'Phone number must not exceed 10 digits' });
            }
        }
    }

    // Email validation
    if (!business.email.trim()) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(business.email)) {
            errors.push({ field: 'email', message: 'Please enter a valid email address' });
        }
    }

    // GST Number validation (Indian GST format: 15 characters)
    if (business.gstNumber.trim()) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(business.gstNumber.toUpperCase())) {
            errors.push({
                field: 'gstNumber',
                message: 'Invalid GST format. Should be 15 characters (e.g., 22AAAAA0000A1Z5)'
            });
        }
    }

    // Address validation
    if (!business.address.trim()) {
        errors.push({ field: 'address', message: 'Address is required' });
    } else if (business.address.trim().length < 10) {
        errors.push({ field: 'address', message: 'Address must be at least 10 characters' });
    } else if (business.address.length > 500) {
        errors.push({ field: 'address', message: 'Address must not exceed 500 characters' });
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
};

// Helper to get error message for a specific field
export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
};