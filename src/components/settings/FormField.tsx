import { memo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    error?: string;
    placeholder?: string;
    type?: string;
    required?: boolean;
    helperText?: string;
    inputFilter?: (value: string) => string;
}

export const FormField = memo(({
    id,
    label,
    value,
    onChange,
    onBlur,
    error,
    placeholder,
    type = 'text',
    required = false,
    helperText,
    inputFilter,
}: FormFieldProps) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let newValue = e.target.value;
        if (inputFilter) {
            newValue = inputFilter(newValue);
        }
        onChange(newValue);
    }, [onChange, inputFilter]);

    return (
        <div className="space-y-2">
            <Label htmlFor={id} className={cn(error && "text-destructive")}>
                {label} {required && '*'}
            </Label>
            <Input
                id={id}
                type={type}
                value={value}
                onChange={handleChange}
                onBlur={onBlur}
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
                placeholder={placeholder}
            />
            {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </p>
            )}
            {!error && helperText && (
                <p className="text-xs text-muted-foreground">{helperText}</p>
            )}
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.value === nextProps.value &&
        prevProps.error === nextProps.error &&
        prevProps.helperText === nextProps.helperText;
});

FormField.displayName = 'FormField';