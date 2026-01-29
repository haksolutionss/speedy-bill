import { memo } from 'react';
import { PrinterDiscovery } from '@/components/settings/PrinterDiscovery';

export const PrintersTab = memo(() => {
    return <PrinterDiscovery />;
});

PrintersTab.displayName = 'PrintersTab';