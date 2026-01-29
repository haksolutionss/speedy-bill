import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingSwitch } from '../SettingSwitch';
import type { AppSettings, Currency } from '@/types/settings';
import { CURRENCY_OPTIONS } from '@/types/settings';

interface CurrencyTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

export const CurrencyTab = memo(({ settings, updateSettings }: CurrencyTabProps) => {
    const handleCurrencyChange = useCallback((value: string) => {
        const selectedOption = CURRENCY_OPTIONS.find(c => c.value === value);
        updateSettings('currency', {
            ...settings.currency,
            currency: value as Currency,
            symbol: selectedOption?.symbol || '₹'
        });
    }, [settings.currency, updateSettings]);

    const handleCommasChange = useCallback((checked: boolean) => {
        updateSettings('currency', { ...settings.currency, useCommas: checked });
    }, [settings.currency, updateSettings]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Currency Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={settings.currency.currency} onValueChange={handleCurrencyChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CURRENCY_OPTIONS.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.symbol} - {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <SettingSwitch
                    label="Use Commas"
                    checked={settings.currency.useCommas}
                    onCheckedChange={handleCommasChange}
                />
            </CardContent>
        </Card>
    );
});

CurrencyTab.displayName = 'CurrencyTab';