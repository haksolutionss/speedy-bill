import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useSettingsStore } from '@/store/settingsStore';
import { toast } from 'sonner';
import { Building2, Receipt, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import type { TaxType, GstMode, Currency } from '@/types/settings';
import { CURRENCY_OPTIONS } from '@/types/settings';

const STEPS = [
  { id: 'business', title: 'Business Info', icon: Building2 },
  { id: 'tax', title: 'Tax Setup', icon: Receipt },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettingsStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Business info
  const [businessName, setBusinessName] = useState(settings.business.name);
  const [businessPhone, setBusinessPhone] = useState(settings.business.phone);
  const [businessAddress, setBusinessAddress] = useState(settings.business.address);

  // Tax settings
  const [taxType, setTaxType] = useState<TaxType>(settings.tax.type);
  const [gstMode, setGstMode] = useState<GstMode>(settings.tax.gstMode);
  const [currency, setCurrency] = useState<Currency>(settings.currency.currency);

  const handleNext = async () => {
    if (currentStep === 0) {
      if (!businessName.trim()) {
        toast.error('Please enter your business name');
        return;
      }
      // Save business info
      await updateSettings('business', {
        ...settings.business,
        name: businessName,
        phone: businessPhone,
        address: businessAddress,
      });
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final step - complete onboarding
      setIsLoading(true);
      try {
        // Save tax settings
        await updateSettings('tax', {
          ...settings.tax,
          type: taxType,
          gstMode: gstMode,
        });

        // Save currency
        const currencyOption = CURRENCY_OPTIONS.find(c => c.value === currency);
        await updateSettings('currency', {
          ...settings.currency,
          currency,
          symbol: currencyOption?.symbol || '₹',
        });

        // Mark onboarding complete
        await updateSettings('onboardingComplete', true);

        toast.success('Setup complete! Welcome to HotelAqsa POS');
        navigate('/');
      } catch (err) {
        console.error('Onboarding error:', err);
        toast.error('Failed to save settings');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    await updateSettings('onboardingComplete', true);
    toast.info('You can complete setup later in Settings');
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {STEPS.map((step, idx) => (
                <div
                  key={step.id}
                  className={`h-2 w-12 rounded-full transition-colors ${
                    idx <= currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const StepIcon = STEPS[currentStep].icon;
              return <StepIcon className="h-5 w-5" />;
            })()}
            {STEPS[currentStep].title}
          </CardTitle>
          <CardDescription>
            {currentStep === 0 && 'Tell us about your restaurant'}
            {currentStep === 1 && 'Configure tax and currency settings'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {currentStep === 0 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="business-name">Restaurant Name *</Label>
                <Input
                  id="business-name"
                  placeholder="e.g., Hotel Aqsa"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-phone">Phone Number</Label>
                <Input
                  id="business-phone"
                  type="tel"
                  placeholder="Contact number"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-address">Address</Label>
                <Input
                  id="business-address"
                  placeholder="Restaurant address"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div className="space-y-3">
                <Label>Tax Type</Label>
                <RadioGroup value={taxType} onValueChange={(v) => setTaxType(v as TaxType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="gst" id="tax-gst" />
                    <Label htmlFor="tax-gst" className="font-normal">GST (Goods & Services Tax)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="tax-other" />
                    <Label htmlFor="tax-other" className="font-normal">Other Tax</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="tax-none" />
                    <Label htmlFor="tax-none" className="font-normal">No Tax</Label>
                  </div>
                </RadioGroup>
              </div>

              {taxType === 'gst' && (
                <div className="space-y-3">
                  <Label>GST Mode</Label>
                  <RadioGroup value={gstMode} onValueChange={(v) => setGstMode(v as GstMode)}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cgst_sgst" id="gst-cgst" />
                      <Label htmlFor="gst-cgst" className="font-normal">CGST + SGST (Intra-state)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="igst" id="gst-igst" />
                      <Label htmlFor="gst-igst" className="font-normal">IGST (Inter-state)</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-3">
                <Label>Currency</Label>
                <RadioGroup value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                  {CURRENCY_OPTIONS.slice(0, 3).map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt.value} id={`currency-${opt.value}`} />
                      <Label htmlFor={`currency-${opt.value}`} className="font-normal">
                        {opt.symbol} - {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
              Skip for now
            </Button>
          </div>

          <Button onClick={handleNext} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {currentStep === STEPS.length - 1 ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
