import { BillingTab, BusinessTab, CurrencyTab, LoyaltyTab, PrintersTab, SyncTab, TaxTab, ThemeTab } from '@/components/settings/tabs';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSettingsStore } from '@/store/settingsStore';
import { validateBusinessField, type ValidationError } from '@/utils/validation';
import { AlertCircle, Building2, CreditCard, Gift, Receipt, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function Settings() {
  const { settings, updateSettings, loadPrinters } = useSettingsStore();
  const [activeTab, setActiveTab] = useState('business');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPrinters();
  }, [loadPrinters]);

  const validateField = useCallback((field: string, value: string) => {
    const error = validateBusinessField(field, value);
    setValidationErrors(prev => {
      const filtered = prev.filter(e => e.field !== field);
      return error ? [...filtered, { field, message: error }] : filtered;
    });
  }, []);

  const validateAllBusinessFields = useCallback(() => {
    const fields = ['name', 'phone', 'email', 'gstNumber', 'address'];
    const errors: ValidationError[] = [];

    fields.forEach(field => {
      const value = settings.business[field as keyof typeof settings.business];
      const error = validateBusinessField(field, value);
      if (error) {
        errors.push({ field, message: error });
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [settings.business]);

  const handleSave = useCallback(async () => {
    setTouchedFields(new Set(['name', 'phone', 'email', 'gstNumber', 'address']));
    const isValid = validateAllBusinessFields();

    if (!isValid) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    toast.success('Settings saved successfully');
  }, [validateAllBusinessFields]);

  const hasValidationErrors = validationErrors.length > 0 && touchedFields.size > 0;

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
        <TabsList className="grid w-max grid-cols-4">
          <TabsTrigger value="business">
            <Building2 className="h-4 w-4 mr-2" />
            Business
            {hasValidationErrors && (
              <AlertCircle className="h-3 w-3 ml-2 text-destructive" />
            )}
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Receipt className="h-4 w-4 mr-2" />
            Tax
          </TabsTrigger>
          {/* <TabsTrigger value="theme">
            <Palette className="h-4 w-4 mr-2" />
            Theme
          </TabsTrigger> */}
          {/* <TabsTrigger value="currency">
            <Banknote className="h-4 w-4 mr-2" />
            Currency
          </TabsTrigger> */}
          <TabsTrigger value="loyalty">
            <Gift className="h-4 w-4 mr-2" />
            Loyalty
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          {/* <TabsTrigger value="printers">
            <Printer className="h-4 w-4 mr-2" />
            Printers
          </TabsTrigger>
          <TabsTrigger value="sync">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync
          </TabsTrigger> */}
        </TabsList>

        <TabsContent value="business" className="mt-6">
          <BusinessTab
            settings={settings}
            updateSettings={updateSettings}
            validationErrors={validationErrors}
            touchedFields={touchedFields}
            setTouchedFields={setTouchedFields}
            validateField={validateField}
          />
        </TabsContent>

        <TabsContent value="tax" className="mt-6">
          <TaxTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        {/* <TabsContent value="theme" className="mt-6">
          <ThemeTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}

        {/* <TabsContent value="currency" className="mt-6">
          <CurrencyTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}

        <TabsContent value="loyalty" className="mt-6">
          <LoyaltyTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <BillingTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        {/* <TabsContent value="printers" className="mt-6">
          <PrintersTab />
        </TabsContent> */}

        {/* <TabsContent value="sync" className="mt-6">
          <SyncTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}