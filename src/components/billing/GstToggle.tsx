import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Receipt } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export function GstToggle() {
  const { settings, updateSettings } = useSettingsStore();
  const isGstEnabled = settings.tax.type !== 'none';

  const handleToggle = (enabled: boolean) => {
    updateSettings('tax', {
      ...settings.tax,
      type: enabled ? 'gst' : 'none',
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Receipt className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="gst-toggle" className="text-xs text-muted-foreground cursor-pointer">
        GST
      </Label>
      <Switch
        id="gst-toggle"
        checked={isGstEnabled}
        onCheckedChange={handleToggle}
        className="scale-75"
      />
    </div>
  );
}
