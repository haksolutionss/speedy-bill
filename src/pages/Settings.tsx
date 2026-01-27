import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettingsStore } from '@/store/settingsStore';
import { PrinterDiscovery } from '@/components/settings/PrinterDiscovery';
import { PortionTemplatesManager } from '@/components/settings/PortionTemplatesManager';
import { toast } from 'sonner';
import { Building2, Receipt, Palette, Banknote, Printer, RefreshCw, Save, Gift, CreditCard, Scale } from 'lucide-react';
import type { TaxType, GstMode, Currency, PaymentMethod } from '@/types/settings';
import { CURRENCY_OPTIONS, FONT_OPTIONS } from '@/types/settings';

export default function Settings() {
  const { settings, updateSettings, loadPrinters } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('business');

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  const handleSave = async () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your POS system</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-max grid-cols-5">
          <TabsTrigger value="business"><Building2 className="h-4 w-4 mr-2" />Business</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="h-4 w-4 mr-2" />Tax</TabsTrigger>
          <TabsTrigger value="portions"><Scale className="h-4 w-4 mr-2" />Portions</TabsTrigger>
          <TabsTrigger value="loyalty"><Gift className="h-4 w-4 mr-2" />Loyalty</TabsTrigger>
          <TabsTrigger value="billing"><CreditCard className="h-4 w-4 mr-2" />Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Your restaurant details for bills and receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input value={settings.business.name} onChange={(e) => updateSettings('business', { ...settings.business, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={settings.business.phone} onChange={(e) => updateSettings('business', { ...settings.business, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={settings.business.email} onChange={(e) => updateSettings('business', { ...settings.business, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>GST Number</Label>
                  <Input value={settings.business.gstNumber} onChange={(e) => updateSettings('business', { ...settings.business, gstNumber: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={settings.business.address} onChange={(e) => updateSettings('business', { ...settings.business, address: e.target.value })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Setup</CardTitle>
              <CardDescription>Configure tax rates and modes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Tax Type</Label>
                <RadioGroup value={settings.tax.type} onValueChange={(v) => updateSettings('tax', { ...settings.tax, type: v as TaxType })}>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="gst" id="gst" /><Label htmlFor="gst">GST</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="other" id="other" /><Label htmlFor="other">Other</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="none" id="none" /><Label htmlFor="none">None</Label></div>
                </RadioGroup>
              </div>
              {settings.tax.type === 'gst' && (
                <div className="space-y-3">
                  <Label>GST Mode</Label>
                  <RadioGroup value={settings.tax.gstMode} onValueChange={(v) => updateSettings('tax', { ...settings.tax, gstMode: v as GstMode })}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="cgst_sgst" id="cgst" /><Label htmlFor="cgst">CGST + SGST</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="igst" id="igst" /><Label htmlFor="igst">IGST</Label></div>
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portion Templates Tab */}
        <TabsContent value="portions" className="mt-6">
          <PortionTemplatesManager />
        </TabsContent>

        <TabsContent value="theme" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Dark Mode</Label>
                <Switch checked={settings.theme.mode === 'dark'} onCheckedChange={(c) => updateSettings('theme', { ...settings.theme, mode: c ? 'dark' : 'light' })} />
              </div>
              <div className="space-y-2">
                <Label>Font Family</Label>
                <Select value={settings.theme.fontFamily} onValueChange={(v) => updateSettings('theme', { ...settings.theme, fontFamily: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currency" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={settings.currency.currency} onValueChange={(v) => {
                  const opt = CURRENCY_OPTIONS.find(c => c.value === v);
                  updateSettings('currency', { ...settings.currency, currency: v as Currency, symbol: opt?.symbol || '₹' });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.symbol} - {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Use Commas</Label>
                <Switch checked={settings.currency.useCommas} onCheckedChange={(c) => updateSettings('currency', { ...settings.currency, useCommas: c })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loyalty Settings Tab */}
        <TabsContent value="loyalty" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points Configuration</CardTitle>
              <CardDescription>Configure how customers earn and redeem loyalty points</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Loyalty Program</Label>
                  <p className="text-sm text-muted-foreground">Allow customers to earn and redeem points</p>
                </div>
                <Switch
                  checked={settings.loyalty.enabled}
                  onCheckedChange={(c) => updateSettings('loyalty', { ...settings.loyalty, enabled: c })}
                />
              </div>

              {settings.loyalty.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount for Points ({settings.currency.symbol})</Label>
                      <Input
                        type="number"
                        value={settings.loyalty.amountForPoints}
                        onChange={(e) => updateSettings('loyalty', { ...settings.loyalty, amountForPoints: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Spend this amount to earn points</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Points Per Amount</Label>
                      <Input
                        type="number"
                        value={settings.loyalty.pointsPerAmount}
                        onChange={(e) => updateSettings('loyalty', { ...settings.loyalty, pointsPerAmount: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Points earned per amount spent</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Redemption Value ({settings.currency.symbol})</Label>
                      <Input
                        type="number"
                        value={settings.loyalty.redemptionValue}
                        onChange={(e) => updateSettings('loyalty', { ...settings.loyalty, redemptionValue: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Value of 1 point when redeemed</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Minimum Points to Redeem</Label>
                      <Input
                        type="number"
                        value={settings.loyalty.minRedemptionPoints}
                        onChange={(e) => updateSettings('loyalty', { ...settings.loyalty, minRedemptionPoints: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Minimum points required for redemption</p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium">Example:</p>
                    <p className="text-sm text-muted-foreground">
                      Customer spends {settings.currency.symbol}{settings.loyalty.amountForPoints} → Earns {settings.loyalty.pointsPerAmount} point(s)<br />
                      {settings.loyalty.minRedemptionPoints} points can be redeemed for {settings.currency.symbol}{settings.loyalty.minRedemptionPoints * settings.loyalty.redemptionValue}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Defaults Tab */}
        <TabsContent value="billing" className="mt-6">
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
                  onValueChange={(v) => updateSettings('billing', { ...settings.billing, defaultPaymentMethod: v as PaymentMethod })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Used when pressing F2 for quick billing</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-settle on Print</Label>
                  <p className="text-sm text-muted-foreground">Automatically settle bill when printing</p>
                </div>
                <Switch
                  checked={settings.billing.autoSettleOnPrint}
                  onCheckedChange={(c) => updateSettings('billing', { ...settings.billing, autoSettleOnPrint: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Print Customer Copy</Label>
                  <p className="text-sm text-muted-foreground">Print an extra copy for customer</p>
                </div>
                <Switch
                  checked={settings.billing.printCustomerCopy}
                  onCheckedChange={(c) => updateSettings('billing', { ...settings.billing, printCustomerCopy: c })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Show Loyalty in Bill</Label>
                  <p className="text-sm text-muted-foreground">Display loyalty points info on printed bill</p>
                </div>
                <Switch
                  checked={settings.billing.showLoyaltyInBill}
                  onCheckedChange={(c) => updateSettings('billing', { ...settings.billing, showLoyaltyInBill: c })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printers" className="mt-6">
          <PrinterDiscovery />
        </TabsContent>

        <TabsContent value="sync" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={settings.sync.mode} onValueChange={(v) => updateSettings('sync', { ...settings.sync, mode: v as 'realtime' | 'polling' })}>
                <div className="flex items-center space-x-2"><RadioGroupItem value="polling" id="polling" /><Label htmlFor="polling">Polling (every 20s)</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="realtime" id="realtime" /><Label htmlFor="realtime">Real-time (Premium)</Label></div>
              </RadioGroup>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
