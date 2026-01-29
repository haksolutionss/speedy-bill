import { memo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingSwitch } from '../SettingSwitch';
import type { AppSettings, PaymentMethod, BillingDefaults } from '@/types/settings';

interface BillingTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

interface PaymentOption {
    value: PaymentMethod;
    label: string;
}

const PAYMENT_METHODS: PaymentOption[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'upi', label: 'UPI' },
];

interface BillingSwitchConfig {
    id: string;
    label: string;
    description: string;
    field: keyof BillingDefaults;
}

const BILLING_SWITCHES: BillingSwitchConfig[] = [
    {
        id: 'autoSettle',
        label: 'Auto-settle on Print',
        description: 'Automatically settle bill when printing',
        field: 'autoSettleOnPrint',
    },
    {
        id: 'customerCopy',
        label: 'Print Customer Copy',
        description: 'Print an extra copy for customer',
        field: 'printCustomerCopy',
    },
    {
        id: 'loyaltyInBill',
        label: 'Show Loyalty in Bill',
        description: 'Display loyalty points info on printed bill',
        field: 'showLoyaltyInBill',
    },
];

export const BillingTab = memo(({ settings, updateSettings }: BillingTabProps) => {
    const handlePaymentMethodChange = useCallback((value: string) => {
        updateSettings('billing', {
            ...settings.billing,
            defaultPaymentMethod: value as PaymentMethod,
        });
    }, [settings.billing, updateSettings]);

    const handleSwitchChange = useCallback((field: BillingSwitchConfig['field']) => {
        return (checked: boolean) => {
            updateSettings('billing', {
                ...settings.billing,
                [field]: checked,
            });
        };
    }, [settings.billing, updateSettings]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing Defaults</CardTitle>
                <CardDescription>Configure default billing behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label>Default Payment Method</Label>
                    <Select
                        value={settings.billing.defaultPaymentMethod}
                        onValueChange={handlePaymentMethodChange}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PAYMENT_METHODS.map(({ value, label }) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Used when pressing F2 for quick billing
                    </p>
                </div>

                {BILLING_SWITCHES.map(({ id, label, description, field }) => (
                    <SettingSwitch
                        key={id}
                        label={label}
                        description={description}
                        checked={Boolean(settings.billing[field])}
                        onCheckedChange={handleSwitchChange(field)}
                    />
                ))}
            </CardContent>
        </Card>
    );
});

BillingTab.displayName = 'BillingTab';