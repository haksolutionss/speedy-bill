import { memo, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SettingSwitch } from '../SettingSwitch';
import type { AppSettings, LoyaltySettings } from '@/types/settings';

interface LoyaltyTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

interface LoyaltyFieldConfig {
    id: string;
    label: string;
    helperText: string;
    field: keyof LoyaltySettings;
}

const LOYALTY_FIELDS: LoyaltyFieldConfig[] = [
    {
        id: 'amountForPoints',
        label: 'Amount for Points',
        helperText: 'Spend this amount to earn points',
        field: 'amountForPoints',
    },
    {
        id: 'pointsPerAmount',
        label: 'Points Per Amount',
        helperText: 'Points earned per amount spent',
        field: 'pointsPerAmount',
    },
    {
        id: 'redemptionValue',
        label: 'Redemption Value',
        helperText: 'Value of 1 point when redeemed',
        field: 'redemptionValue',
    },
    {
        id: 'minRedemptionPoints',
        label: 'Minimum Points to Redeem',
        helperText: 'Minimum points required for redemption',
        field: 'minRedemptionPoints',
    },
];

export const LoyaltyTab = memo(({ settings, updateSettings }: LoyaltyTabProps) => {
    const handleEnabledChange = useCallback((checked: boolean) => {
        updateSettings('loyalty', { ...settings.loyalty, enabled: checked });
    }, [settings.loyalty, updateSettings]);

    const handleFieldChange = useCallback((field: keyof LoyaltySettings, value: number) => {
        updateSettings('loyalty', { ...settings.loyalty, [field]: value });
    }, [settings.loyalty, updateSettings]);

    const exampleText = useMemo(() => {
        const { currency } = settings;
        const { amountForPoints, pointsPerAmount, minRedemptionPoints, redemptionValue } = settings.loyalty;
        const redemptionAmount = minRedemptionPoints * redemptionValue;

        return (
            <>
                Customer spends {currency.symbol}{amountForPoints} → Earns {pointsPerAmount} point(s)<br />
                {minRedemptionPoints} points can be redeemed for {currency.symbol}{redemptionAmount}
            </>
        );
    }, [settings.currency, settings.loyalty]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Loyalty Points Configuration</CardTitle>
                <CardDescription>Configure how customers earn and redeem loyalty points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <SettingSwitch
                    label="Enable Loyalty Program"
                    description="Allow customers to earn and redeem points"
                    checked={settings.loyalty.enabled}
                    onCheckedChange={handleEnabledChange}
                />

                {settings.loyalty.enabled && (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            {LOYALTY_FIELDS.map(({ id, label, helperText, field }) => (
                                <div key={id} className="space-y-2">
                                    <Label>
                                        {label}
                                        {(field === 'amountForPoints' || field === 'redemptionValue') &&
                                            ` (${settings.currency.symbol})`
                                        }
                                    </Label>
                                    <Input
                                        type="number"
                                        value={String(settings.loyalty[field])}
                                        onChange={(e) => handleFieldChange(field, Number(e.target.value))}
                                        min="0"
                                        step={field === 'redemptionValue' ? '0.01' : '1'}
                                    />
                                    <p className="text-xs text-muted-foreground">{helperText}</p>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium">Example:</p>
                            <p className="text-sm text-muted-foreground">{exampleText}</p>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
});

LoyaltyTab.displayName = 'LoyaltyTab';