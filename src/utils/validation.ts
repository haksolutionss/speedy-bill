export interface ValidationError {
    field: string;
    message: string;
}

export const validateBusinessField = (field: string, value: string): string | undefined => {
    switch (field) {
        case 'name':
            if (!value.trim()) return 'Restaurant name is required';
            if (value.trim().length < 2) return 'Name must be at least 2 characters';
            if (value.trim().length > 100) return 'Name must not exceed 100 characters';
            return undefined;

        case 'phone':
            if (!value.trim()) return 'Phone number is required';
            const digits = value.replace(/\D/g, '');
            if (digits.length !== 10) return 'Phone number must be exactly 10 digits';
            if (!['6', '7', '8', '9'].includes(digits[0])) {
                return 'Invalid Indian mobile number';
            }
            return undefined;

        case 'email':
            if (!value.trim()) return 'Email is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return 'Invalid email format';
            return undefined;

        case 'gstNumber':
            if (!value) return undefined;
            if (value.length !== 15) return 'GST number must be exactly 15 characters';
            const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstRegex.test(value)) return 'Invalid GST number format';
            return undefined;

        case 'address':
            if (!value.trim()) return 'Address is required';
            if (value.trim().length < 10) return 'Address must be at least 10 characters';
            if (value.trim().length > 500) return 'Address must not exceed 500 characters';
            return undefined;

        default:
            return undefined;
    }
};

export const getFieldError = (errors: ValidationError[], field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
};