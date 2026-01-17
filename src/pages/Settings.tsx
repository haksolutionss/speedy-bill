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
import { toast } from 'sonner';
import { Building2, Receipt, Palette, Banknote, Printer, RefreshCw, Save } from 'lucide-react';
import type { TaxType, GstMode, Currency } from '@/types/settings';
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
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="business"><Building2 className="h-4 w-4 mr-2" />Business</TabsTrigger>
          <TabsTrigger value="tax"><Receipt className="h-4 w-4 mr-2" />Tax</TabsTrigger>
          <TabsTrigger value="theme"><Palette className="h-4 w-4 mr-2" />Theme</TabsTrigger>
          <TabsTrigger value="currency"><Banknote className="h-4 w-4 mr-2" />Currency</TabsTrigger>
          <TabsTrigger value="printers"><Printer className="h-4 w-4 mr-2" />Printers</TabsTrigger>
          <TabsTrigger value="sync"><RefreshCw className="h-4 w-4 mr-2" />Sync</TabsTrigger>
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
