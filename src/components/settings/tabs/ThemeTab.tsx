import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SettingSwitch } from '../SettingSwitch';
import type { AppSettings } from '@/types/settings';
import { FONT_OPTIONS } from '@/types/settings';

interface ThemeTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

export const ThemeTab = memo(({ settings, updateSettings }: ThemeTabProps) => {
    const handleDarkModeChange = useCallback((checked: boolean) => {
        updateSettings('theme', {
            ...settings.theme,
            mode: checked ? 'dark' : 'light'
        });
    }, [settings.theme, updateSettings]);

    const handleFontFamilyChange = useCallback((value: string) => {
        updateSettings('theme', { ...settings.theme, fontFamily: value });
    }, [settings.theme, updateSettings]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Theme Customization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <SettingSwitch
                    label="Dark Mode"
                    checked={settings.theme.mode === 'dark'}
                    onCheckedChange={handleDarkModeChange}
                />

                <div className="space-y-2">
                    <Label>Font Family</Label>
                    <Select value={settings.theme.fontFamily} onValueChange={handleFontFamilyChange}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_OPTIONS.map(f => (
                                <SelectItem key={f.value} value={f.value}>
                                    {f.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
});

ThemeTab.displayName = 'ThemeTab';