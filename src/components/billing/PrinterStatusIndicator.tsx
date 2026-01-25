import { useState, useEffect, useCallback } from 'react';
import { Printer, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Wifi, Usb, Monitor, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSettingsStore } from '@/store/settingsStore';
import { useElectronPrint } from '@/hooks/useElectronPrint';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import type { Printer as PrinterType } from '@/types/settings';

interface PrinterStatusIndicatorProps {
  compact?: boolean;
}

interface PrinterDiagnostics {
  status: string;
  message?: string;
  troubleshooting?: string[];
}

export function PrinterStatusIndicator({ compact = false }: PrinterStatusIndicatorProps) {
  const { printers } = useSettingsStore();
  const { isElectron, printerStatus, checkPrinterStatus } = useElectronPrint();
  const [isChecking, setIsChecking] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Record<string, PrinterDiagnostics>>({});
  const [expandedPrinter, setExpandedPrinter] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check statuses on mount
  useEffect(() => {
    if (isElectron && printers.length > 0) {
      refreshStatuses();
    }
  }, [isElectron, printers.length]);

  const refreshStatuses = useCallback(async () => {
    if (!isElectron) return;
    setIsChecking(true);
    const newDiagnostics: Record<string, PrinterDiagnostics> = {};

    try {
      const results = await Promise.all(
        printers.map(async (printer) => {
          console.log("ssettinhgg", printer)
          const result = await checkPrinterStatus(printer);
          return { id: printer.id, result };
        })
      );

      results.forEach(({ id, result }) => {
        newDiagnostics[id] = result;
      });

      setDiagnostics(newDiagnostics);
    } finally {
      setIsChecking(false);
    }
  }, [isElectron, printers, checkPrinterStatus]);

  // Calculate overall status
  const getOverallStatus = () => {
    if (!isElectron) return 'browser';
    if (printers.length === 0) return 'none';

    const statuses = printers.map(p => printerStatus[p.id] || diagnostics[p.id]?.status);
    if (statuses.every(s => s === 'connected')) return 'all-connected';
    if (statuses.some(s => s === 'connected')) return 'partial';
    if (statuses.some(s => s === 'error' || s === 'disconnected' || s === 'offline')) return 'error';
    return 'unknown';
  };

  const overallStatus = getOverallStatus();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'ready':
        return <CheckCircle2 className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />;
      case 'disconnected':
      case 'error':
      case 'offline':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'timeout':
      case 'paused':
      case 'paper_jam':
      case 'out_of_paper':
        return <AlertTriangle className="h-3 w-3 text-amber-500 dark:text-amber-400" />;
      default:
        return <HelpCircle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getPrinterTypeIcon = (type: string) => {
    switch (type) {
      case 'usb':
        return <Usb className="h-3 w-3 text-muted-foreground" />;
      case 'network':
        return <Wifi className="h-3 w-3 text-muted-foreground" />;
      case 'system':
        return <Monitor className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Printer className="h-3 w-3 text-muted-foreground" />;
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

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      connected: 'Connected',
      ready: 'Ready',
      disconnected: 'Disconnected',
      offline: 'Offline',
      error: 'Error',
      timeout: 'Timeout',
      paused: 'Paused',
      paper_jam: 'Paper Jam',
      out_of_paper: 'No Paper',
      unavailable: 'Not Available',
      unknown: 'Unknown',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'ready':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'disconnected':
      case 'offline':
      case 'error':
        return 'text-destructive';
      case 'timeout':
      case 'paused':
      case 'paper_jam':
      case 'out_of_paper':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-muted-foreground';
    }
  };

  const getConnectedCount = () => {
    return printers.filter(p => {
      const status = printerStatus[p.id] || diagnostics[p.id]?.status;
      return status === 'connected' || status === 'ready';
    }).length;
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
        <PopoverContent align="end" className="w-80">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Printer Status</h4>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigate('/settings')}
                  title="Printer Settings"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={refreshStatuses}
                  disabled={isChecking || !isElectron}
                  title="Refresh Status"
                >
                  <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
                </Button>
              </div>
            </div>

            {!isElectron ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
                  Browser Mode Active
                </p>
                <p className="text-xs text-muted-foreground">
                  Direct thermal printing requires the desktop app. Bills will print via browser dialog.
                </p>
              </div>
            ) : printers.length === 0 ? (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2">
                  No printers configured. Add printers in Settings.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Configure Printers
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Summary */}
                <div className="flex items-center justify-between px-2 py-1 rounded bg-muted/30">
                  <span className="text-xs text-muted-foreground">
                    {getConnectedCount()} of {printers.length} connected
                  </span>
                </div>

                {printers.map((printer) => {
                  const status = printerStatus[printer.id] || diagnostics[printer.id]?.status || 'unknown';
                  const diag = diagnostics[printer.id];
                  const isExpanded = expandedPrinter === printer.id;

                  return (
                    <div
                      key={printer.id}
                      className="rounded-lg bg-muted/50 overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center justify-between p-2 hover:bg-muted/70 transition-colors"
                        onClick={() => setExpandedPrinter(isExpanded ? null : printer.id)}
                      >
                        <div className="flex items-center gap-2">
                          {getPrinterTypeIcon(printer.type)}
                          <div className="text-left">
                            <p className="text-xs font-medium truncate max-w-[140px]">{printer.name}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">
                              {printer.role} • {printer.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-medium", getStatusColor(status))}>
                            {getStatusLabel(status)}
                          </span>
                          {getStatusIcon(status)}
                        </div>
                      </button>

                      {/* Expanded diagnostics */}
                      {isExpanded && (
                        <div className="px-3 pb-3 border-t border-border/50">
                          {diag?.message && (
                            <p className="text-xs text-muted-foreground mt-2 mb-2">
                              {diag.message}
                            </p>
                          )}

                          {status !== 'connected' && status !== 'ready' && (
                            <div className="space-y-2 mt-2">
                              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                Troubleshooting:
                              </p>
                              <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
                                {diag?.troubleshooting?.map((tip, i) => (
                                  <li key={i}>{tip}</li>
                                )) || (
                                    <>
                                      {printer.type === 'usb' && (
                                        <>
                                          <li>Check if printer is connected via USB</li>
                                          <li>Verify printer is powered on</li>
                                          <li>Try unplugging and reconnecting</li>
                                        </>
                                      )}
                                      {printer.type === 'network' && (
                                        <>
                                          <li>Check if printer IP ({printer.ipAddress}) is correct</li>
                                          <li>Verify printer is on the same network</li>
                                          <li>Check if port {printer.port || 9100} is correct</li>
                                        </>
                                      )}
                                      {printer.type === 'system' && (
                                        <>
                                          <li>Check Windows Printers & Scanners settings</li>
                                          <li>Verify printer is not paused</li>
                                          <li>Restart Windows Print Spooler service</li>
                                          <li>Try setting as default printer in Windows</li>
                                        </>
                                      )}
                                    </>
                                  )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className={cn(
              "text-[10px] text-center py-1 px-2 rounded",
              overallStatus === 'all-connected' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              overallStatus === 'partial' && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
              overallStatus === 'error' && "bg-destructive/10 text-destructive",
              overallStatus === 'browser' && "bg-primary/10 text-primary",
              (overallStatus === 'none' || overallStatus === 'unknown') && "text-muted-foreground"
            )}>
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