import { memo, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '../FormField';
import { getFieldError, type ValidationError } from '@/utils/validation';
import type { AppSettings, BusinessInfo } from '@/types/settings';

interface BusinessTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
    validationErrors: ValidationError[];
    touchedFields: Set<string>;
    setTouchedFields: React.Dispatch<React.SetStateAction<Set<string>>>;
    validateField: (field: string, value: string) => void;
}

export const BusinessTab = memo(({
    settings,
    updateSettings,
    validationErrors,
    touchedFields,
    setTouchedFields,
    validateField,
}: BusinessTabProps) => {
    const getError = useCallback((field: string) => {
        if (!touchedFields.has(field)) return undefined;
        return getFieldError(validationErrors, field);
    }, [touchedFields, validationErrors]);

    const handleFieldChange = useCallback((field: keyof typeof settings.business, value: string) => {
        updateSettings('business', { ...settings.business, [field]: value });
        setTouchedFields(prev => new Set(prev).add(field));
        validateField(field, value);
    }, [settings.business, updateSettings, setTouchedFields, validateField]);

    const handleFieldBlur = useCallback((field: string, value: string) => {
        setTouchedFields(prev => new Set(prev).add(field));
        validateField(field, value);
    }, [setTouchedFields, validateField]);

    const phoneFilter = useMemo(() => (value: string) => {
        return value.replace(/[^\d\s\-+()]/g, '').slice(0, 20);
    }, []);

    const gstFilter = useMemo(() => (value: string) => {
        return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    }, []);

    const fssaiFilter = useMemo(() => (value: string) => {
        return value.replace(/[^0-9]/g, '').slice(0, 14);
    }, []);

    const getPhoneHelperText = useMemo(() => {
        if (!settings.business.phone) return undefined;
        const digitCount = settings.business.phone.replace(/\D/g, '').length;
        return `${digitCount}/10 digits`;
    }, [settings.business.phone]);

    const getGstHelperText = useMemo(() => {
        if (!settings.business.gstNumber) return undefined;
        const length = settings.business.gstNumber.length;
        return `${length}/15 characters`;
    }, [settings.business.gstNumber]);

    const getFssaiHelperText = useMemo(() => {
        if (!settings.business.fssaiNumber) return undefined;
        const length = settings.business.fssaiNumber.length;
        return `${length}/14 digits`;
    }, [settings.business.fssaiNumber]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>Your restaurant details for bills and receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        id="name"
                        label="Restaurant Name"
                        value={settings.business.name}
                        onChange={(value) => handleFieldChange('name', value)}
                        onBlur={() => handleFieldBlur('name', settings.business.name)}
                        error={getError('name')}
                        placeholder="Enter restaurant name"
                        required
                    />

                    <FormField
                        id="phone"
                        label="Phone"
                        type="tel"
                        value={settings.business.phone}
                        onChange={(value) => handleFieldChange('phone', value)}
                        onBlur={() => handleFieldBlur('phone', settings.business.phone)}
                        error={getError('phone')}
                        placeholder="+91 98765 43210"
                        required
                        helperText={getPhoneHelperText}
                        inputFilter={phoneFilter}
                    />

                    <FormField
                        id="email"
                        label="Email"
                        type="email"
                        value={settings.business.email}
                        onChange={(value) => handleFieldChange('email', value)}
                        onBlur={() => handleFieldBlur('email', settings.business.email)}
                        error={getError('email')}
                        placeholder="restaurant@example.com"
                        required
                    />

                    <FormField
                        id="gstNumber"
                        label="GST Number"
                        value={settings.business.gstNumber}
                        onChange={(value) => handleFieldChange('gstNumber', value)}
                        onBlur={() => handleFieldBlur('gstNumber', settings.business.gstNumber)}
                        error={getError('gstNumber')}
                        placeholder="22AAAAA0000A1Z5"
                        helperText={getGstHelperText}
                        inputFilter={gstFilter}
                    />

                    <FormField
                        id="fssaiNumber"
                        label="FSSAI License Number"
                        value={settings.business.fssaiNumber || ''}
                        onChange={(value) => handleFieldChange('fssaiNumber', value)}
                        onBlur={() => handleFieldBlur('fssaiNumber', settings.business.fssaiNumber || '')}
                        error={getError('fssaiNumber')}
                        placeholder="10721026000597"
                        helperText={getFssaiHelperText}
                        inputFilter={fssaiFilter}
                    />
                </div>

                <FormField
                    id="address"
                    label="Address"
                    value={settings.business.address}
                    onChange={(value) => handleFieldChange('address', value)}
                    onBlur={() => handleFieldBlur('address', settings.business.address)}
                    error={getError('address')}
                    placeholder="Enter complete business address"
                    required
                />
            </CardContent>
        </Card>
    );
});

BusinessTab.displayName = 'BusinessTab';