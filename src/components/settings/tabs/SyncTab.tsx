import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { AppSettings, SyncMode } from '@/types/settings';

interface SyncTabProps {
    settings: AppSettings;
    updateSettings: (section: keyof AppSettings, data: any) => void;
}

const SYNC_MODES: { value: SyncMode; label: string; id: string }[] = [
    { value: 'polling', label: 'Polling (every 20s)', id: 'polling' },
    { value: 'realtime', label: 'Real-time (Premium)', id: 'realtime' },
];

export const SyncTab = memo(({ settings, updateSettings }: SyncTabProps) => {
    const handleSyncModeChange = useCallback((value: string) => {
        updateSettings('sync', { ...settings.sync, mode: value as SyncMode });
    }, [settings.sync, updateSettings]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Sync Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup value={settings.sync.mode} onValueChange={handleSyncModeChange}>
                    {SYNC_MODES.map(({ value, label, id }) => (
                        <div key={value} className="flex items-center space-x-2">
                            <RadioGroupItem value={value} id={id} />
                            <Label htmlFor={id}>{label}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>
    );
});

SyncTab.displayName = 'SyncTab';