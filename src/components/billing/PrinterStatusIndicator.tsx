import { useState, useEffect } from 'react';
import { Printer, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Wifi, Usb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/store/settingsStore';
import { useElectronPrint } from '@/hooks/useElectronPrint';
import { cn } from '@/lib/utils';
import type { Printer as PrinterType } from '@/types/settings';

interface PrinterStatusIndicatorProps {
  compact?: boolean;
}

export function PrinterStatusIndicator({ compact = false }: PrinterStatusIndicatorProps) {
  const { printers } = useSettingsStore();
  const { isElectron, printerStatus, checkPrinterStatus } = useElectronPrint();
  const [isChecking, setIsChecking] = useState(false);

  // Check statuses on mount
  useEffect(() => {
    if (isElectron && printers.length > 0) {
      refreshStatuses();
    }
  }, [isElectron, printers.length]);

  const refreshStatuses = async () => {
    if (!isElectron) return;
    setIsChecking(true);
    try {
      for (const printer of printers) {
        await checkPrinterStatus(printer);
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Calculate overall status
  const getOverallStatus = () => {
    if (!isElectron) return 'browser';
    if (printers.length === 0) return 'none';
    
    const statuses = printers.map(p => printerStatus[p.id]);
    if (statuses.every(s => s === 'connected')) return 'all-connected';
    if (statuses.some(s => s === 'connected')) return 'partial';
    if (statuses.some(s => s === 'error' || s === 'disconnected')) return 'error';
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />;
      case 'disconnected':
      case 'error':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'timeout':
        return <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getIndicatorColor = () => {
    switch (overallStatus) {
      case 'all-connected':
        return 'bg-emerald-500 dark:bg-emerald-400';
      case 'partial':
        return 'bg-amber-500 dark:bg-amber-400';
      case 'error':
        return 'bg-destructive';
      case 'browser':
        return 'bg-primary';
      default:
        return 'bg-muted-foreground';
    }
  };

  const getIndicatorText = () => {
    switch (overallStatus) {
      case 'all-connected':
        return 'All printers ready';
      case 'partial':
        return 'Some printers offline';
      case 'error':
        return 'Printers offline';
      case 'browser':
        return 'Browser mode';
      case 'none':
        return 'No printers';
      default:
        return 'Checking...';
    }
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-2 px-2">
            <div className="relative">
              <Printer className="h-4 w-4" />
              <span className={cn(
                "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
                getIndicatorColor()
              )} />
            </div>
            <span className="text-xs hidden sm:inline">{printers.length}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Printer Status</h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={refreshStatuses}
                disabled={isChecking || !isElectron}
              >
                <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
              </Button>
            </div>

            {!isElectron ? (
              <p className="text-xs text-muted-foreground">
                Running in browser mode. Direct printing requires the desktop app.
              </p>
            ) : printers.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No printers configured. Go to Settings to add printers.
              </p>
            ) : (
              <div className="space-y-2">
                {printers.map((printer) => (
                  <div
                    key={printer.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {printer.type === 'usb' ? (
                        <Usb className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Wifi className="h-3 w-3 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{printer.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{printer.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(printerStatus[printer.id] || 'unknown')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              {getIndicatorText()}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Full version for non-compact display
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Printer className="h-4 w-4 text-muted-foreground" />
        <span className={cn(
          "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full",
          getIndicatorColor()
        )} />
      </div>
      <span className="text-xs text-muted-foreground">{getIndicatorText()}</span>
    </div>
  );
}
