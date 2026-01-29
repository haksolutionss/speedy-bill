import { memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { AppSettings, TaxType, GstMode } from '@/types/settings';

interface TaxTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

const TAX_TYPES: { value: TaxType; label: string; id: string }[] = [
    { value: 'gst', label: 'GST', id: 'gst' },
    { value: 'other', label: 'Other', id: 'other' },
    { value: 'none', label: 'None', id: 'none' },
];

const GST_MODES: { value: GstMode; label: string; id: string }[] = [
    { value: 'cgst_sgst', label: 'CGST + SGST', id: 'cgst' },
    { value: 'igst', label: 'IGST', id: 'igst' },
];

export const TaxTab = memo(({ settings, updateSettings }: TaxTabProps) => {
    const handleTaxTypeChange = useCallback((value: string) => {
        updateSettings('tax', { ...settings.tax, type: value as TaxType });
    }, [settings.tax, updateSettings]);

    const handleGstModeChange = useCallback((value: string) => {
        updateSettings('tax', { ...settings.tax, gstMode: value as GstMode });
    }, [settings.tax, updateSettings]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tax Setup</CardTitle>
                <CardDescription>Configure tax rates and modes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label>Tax Type</Label>
                    <RadioGroup value={settings.tax.type} onValueChange={handleTaxTypeChange}>
                        {TAX_TYPES.map(({ value, label, id }) => (
                            <div key={value} className="flex items-center space-x-2">
                                <RadioGroupItem value={value} id={id} />
                                <Label htmlFor={id}>{label}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>

                {settings.tax.type === 'gst' && (
                    <div className="space-y-3">
                        <Label>GST Mode</Label>
                        <RadioGroup value={settings.tax.gstMode} onValueChange={handleGstModeChange}>
                            {GST_MODES.map(({ value, label, id }) => (
                                <div key={value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={value} id={id} />
                                    <Label htmlFor={id}>{label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>
                )}
            </CardContent>
        </Card>
    );
});

TaxTab.displayName = 'TaxTab';