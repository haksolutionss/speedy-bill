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
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your POS system</p>
        </div>
        <Button onClick={handleSave} className="w-max sm:w-auto">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        {/* Scrollable Tabs List */}
        <div className="relative -mx-4 md:mx-0">
          <div className="overflow-x-auto scrollbar-hide px-4 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0 h-auto p-1 gap-1">
              <TabsTrigger value="business" className="flex-shrink-0 text-xs sm:text-sm">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="">Business</span>
                {hasValidationErrors && (
                  <AlertCircle className="h-3 w-3 ml-1 sm:ml-2 text-destructive flex-shrink-0" />
                )}
              </TabsTrigger>
              <TabsTrigger value="tax" className="flex-shrink-0 text-xs sm:text-sm">
                <Receipt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span>Tax</span>
              </TabsTrigger>
              {/* <TabsTrigger value="theme" className="flex-shrink-0 text-xs sm:text-sm">
                <Palette className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span>Theme</span>
              </TabsTrigger> */}
              {/* <TabsTrigger value="currency" className="flex-shrink-0 text-xs sm:text-sm">
                <Banknote className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="">Currency</span>
                <span className="xs:hidden">Curr.</span>
              </TabsTrigger> */}
              <TabsTrigger value="loyalty" className="flex-shrink-0 text-xs sm:text-sm">
                <Gift className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="">Loyalty</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex-shrink-0 text-xs sm:text-sm">
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="">Billing</span>
              </TabsTrigger>
              {/* <TabsTrigger value="printers" className="flex-shrink-0 text-xs sm:text-sm">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="">Printers</span>
                <span className="xs:hidden">Print.</span>
              </TabsTrigger> */}
              {/* <TabsTrigger value="sync" className="flex-shrink-0 text-xs sm:text-sm">
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span>Sync</span>
              </TabsTrigger> */}
            </TabsList>
          </div>
          {/* Fade indicators for scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none md:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none md:hidden" />
        </div>

        {/* Tab Contents */}
        <TabsContent value="business" className="mt-0">
          <BusinessTab
            settings={settings}
            updateSettings={updateSettings}
            validationErrors={validationErrors}
            touchedFields={touchedFields}
            setTouchedFields={setTouchedFields}
            validateField={validateField}
          />
        </TabsContent>

        <TabsContent value="tax" className="mt-0">
          <TaxTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        {/* <TabsContent value="theme" className="mt-0">
          <ThemeTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}

        {/* <TabsContent value="currency" className="mt-0">
          <CurrencyTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}

        <TabsContent value="loyalty" className="mt-0">
          <LoyaltyTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        <TabsContent value="billing" className="mt-0">
          <BillingTab settings={settings} updateSettings={updateSettings} />
        </TabsContent>

        {/* <TabsContent value="printers" className="mt-0">
          <PrintersTab />
        </TabsContent> */}

        {/* <TabsContent value="sync" className="mt-0">
          <SyncTab settings={settings} updateSettings={updateSettings} />
        </TabsContent> */}
      </Tabs>
    </div>
  );
}