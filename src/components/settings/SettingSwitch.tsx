import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface SettingSwitchProps {
    label: string;
    description?: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

export const SettingSwitch = memo(({
    label,
    description,
    checked,
    onCheckedChange,
}: SettingSwitchProps) => {
    return (
        <div className="flex items-center justify-between">
            <div>
                <Label>{label}</Label>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
});

SettingSwitch.displayName = 'SettingSwitch';