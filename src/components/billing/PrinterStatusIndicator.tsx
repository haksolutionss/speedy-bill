import { useState, useEffect } from 'react';
import { Printer, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Usb, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { cn } from '@/lib/utils';

/**
 * Printer Status Indicator - Shows POSYTUDE YHD-8330 connection status
 */
export function PrinterStatusIndicator() {
  const { isElectron, printer, status, isPrinting, discoverPrinter, testPrint, refreshStatus } = usePosytudePrinter();
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Periodic status check
  useEffect(() => {
    if (!isElectron || !printer) return;
    
    const interval = setInterval(() => {
      refreshStatus();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isElectron, printer, refreshStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await discoverPrinter();
    setIsRefreshing(false);
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    const result = await testPrint();
    setIsTesting(false);
    
    if (!result.success) {
      console.error('Test print failed:', result.error);
    }
  };

  // Status icon and color
  const getStatusDisplay = () => {
    if (!isElectron) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'Browser Mode'
      };
    }

    if (isPrinting) {
      return {
        icon: <Printer className="h-4 w-4 animate-pulse" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        label: 'Printing...'
      };
    }

    if (printer?.status === 'connected') {
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        label: 'Connected'
      };
    }

    if (status.status === 'error') {
      return {
        icon: <XCircle className="h-4 w-4" />,
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        label: 'Error'
      };
    }

    return {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      label: 'Disconnected'
    };
  };

  const display = getStatusDisplay();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "gap-2 h-8 px-3",
            display.bgColor
          )}
        >
          <span className={display.color}>{display.icon}</span>
          <span className="text-xs hidden sm:inline">{display.label}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Usb className="h-5 w-5 text-primary" />
            <div>
              <h4 className="font-medium">POSYTUDE YHD-8330</h4>
              <p className="text-xs text-muted-foreground">USB Thermal Printer</p>
            </div>
          </div>

          {/* Status */}
          <div className={cn(
            "p-3 rounded-lg",
            display.bgColor
          )}>
            <div className="flex items-center gap-2">
              <span className={display.color}>{display.icon}</span>
              <span className="font-medium">{display.label}</span>
            </div>
            {status.message && (
              <p className="text-sm text-muted-foreground mt-1">{status.message}</p>
            )}
          </div>

          {/* Printer Details */}
          {printer && (
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span>{printer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format:</span>
                <span>{printer.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vendor ID:</span>
                <span className="font-mono text-xs">0x{printer.vendorId.toString(16).padStart(4, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Product ID:</span>
                <span className="font-mono text-xs">0x{printer.productId.toString(16).padStart(4, '0')}</span>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {status.troubleshooting && status.troubleshooting.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-sm font-medium">
                <HelpCircle className="h-4 w-4" />
                <span>Troubleshooting</span>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1">
                {status.troubleshooting.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleTestPrint}
              disabled={!printer || isTesting}
            >
              <Printer className={cn("h-4 w-4 mr-1", isTesting && "animate-pulse")} />
              Test Print
            </Button>
          </div>

          {/* Not in Electron warning */}
          {!isElectron && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Desktop App Required</p>
              <p className="text-muted-foreground text-xs">
                USB printing requires the SpeedyBill POS desktop application.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
