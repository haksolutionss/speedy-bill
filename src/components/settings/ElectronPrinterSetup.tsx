import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Printer, 
  Usb, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Monitor,
  Download,
  Settings2,
  TestTube
} from 'lucide-react';
import { useElectronPrint } from '@/hooks/useElectronPrint';
import { useSettingsStore } from '@/store/settingsStore';
import { isElectron, hasElectronAPI } from '@/lib/electron';
import type { Printer as PrinterType, PrinterRole, PrintFormat } from '@/types/settings';

export const ElectronPrinterSetup: React.FC = () => {
  const { 
    isElectron: isElectronEnv, 
    usbPrinters, 
    printerStatus,
    scanUSBPrinters, 
    testPrinter,
    checkPrinterStatus 
  } = useElectronPrint();
  
  const { 
    printers,
    addPrinter,
    updatePrinter,
    deletePrinter 
  } = useSettingsStore();
  const [isScanning, setIsScanning] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualPrinter, setManualPrinter] = useState({
    name: '',
    type: 'network' as 'usb' | 'network',
    ip: '',
    port: '9100',
    role: 'counter' as PrinterRole,
    format: '80mm' as PrintFormat,
  });

  // Check printer statuses periodically
  useEffect(() => {
    if (!isElectronEnv) return;
    
    const checkStatuses = async () => {
      for (const printer of printers || []) {
        await checkPrinterStatus(printer);
      }
    };
    
    checkStatuses();
    const interval = setInterval(checkStatuses, 30000);
    
    return () => clearInterval(interval);
  }, [isElectronEnv, printers, checkPrinterStatus]);

  const handleScanUSB = async () => {
    setIsScanning(true);
    try {
      const printers = await scanUSBPrinters();
      if (printers.length > 0) {
        toast.success(`Found ${printers.length} USB printer(s)`);
      } else {
        toast.info('No USB printers found');
      }
    } catch (error) {
      toast.error('Failed to scan for USB printers');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddUSBPrinter = async (usbPrinter: any) => {
    const exists = printers.some(p => 
      p.vendorId === usbPrinter.vendorId && p.productId === usbPrinter.productId
    );
    
    if (exists) {
      toast.info('This printer is already configured');
      return;
    }

    try {
      await addPrinter({
        name: usbPrinter.name || `USB Printer`,
        type: 'usb',
        vendorId: usbPrinter.vendorId,
        productId: usbPrinter.productId,
        role: 'counter',
        format: '80mm',
        isActive: true,
        isDefault: printers.length === 0,
      });
      toast.success('USB printer added successfully');
    } catch (error) {
      toast.error('Failed to add printer');
    }
  };

  const handleAddManualPrinter = async () => {
    if (!manualPrinter.name.trim()) {
      toast.error('Please enter a printer name');
      return;
    }

    if (manualPrinter.type === 'network' && !manualPrinter.ip.trim()) {
      toast.error('Please enter the printer IP address');
      return;
    }

    try {
      await addPrinter({
        name: manualPrinter.name,
        type: manualPrinter.type,
        ipAddress: manualPrinter.type === 'network' ? manualPrinter.ip : undefined,
        port: manualPrinter.type === 'network' ? parseInt(manualPrinter.port) : undefined,
        role: manualPrinter.role,
        format: manualPrinter.format,
        isActive: true,
        isDefault: printers.length === 0,
      });
      
      toast.success('Printer added successfully');
      setShowManualAdd(false);
      setManualPrinter({
        name: '',
        type: 'network',
        ip: '',
        port: '9100',
        role: 'counter',
        format: '80mm',
      });
    } catch (error) {
      toast.error('Failed to add printer');
    }
  };

  const handleTestPrinter = async (printer: PrinterType) => {
    toast.loading('Printing test page...', { id: 'test-print' });
    
    const result = await testPrinter(printer);
    
    if (result.success) {
      toast.success('Test print successful!', { id: 'test-print' });
    } else {
      toast.error(`Test print failed: ${result.error}`, { id: 'test-print' });
    }
  };

  const handleRemovePrinter = async (printerId: string) => {
    try {
      await deletePrinter(printerId);
      toast.success('Printer removed');
    } catch (error) {
      toast.error('Failed to remove printer');
    }
  };

  const handleUpdatePrinter = async (printerId: string, updates: Partial<PrinterType>) => {
    try {
      await updatePrinter(printerId, updates);
    } catch (error) {
      toast.error('Failed to update printer');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'timeout':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Show web app notice if not in Electron
  if (!isElectronEnv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Desktop App Required
          </CardTitle>
          <CardDescription>
            For reliable POS printing, download the SpeedyBill desktop application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Browser Limitations</AlertTitle>
            <AlertDescription>
              Web browsers have security restrictions that prevent direct printer access.
              The desktop app provides:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Direct USB printer support</li>
                <li>Network printer access (LAN)</li>
                <li>Silent printing (no dialogs)</li>
                <li>Auto-print receipts</li>
                <li>Cash drawer support</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          <div className="flex flex-col gap-3">
            <Button className="w-full" size="lg">
              <Download className="h-4 w-4 mr-2" />
              Download SpeedyBill POS for Windows
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Version 1.0.0 • Windows 10/11 (64-bit)
            </p>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Installation Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the installer (.exe file)</li>
              <li>Run the installer as Administrator</li>
              <li>Follow the setup wizard</li>
              <li>Launch SpeedyBill POS from desktop</li>
              <li>Configure printers in Settings</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Electron Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Desktop Mode Active
          </CardTitle>
          <CardDescription>
            Full printer access available. Configure your thermal printers below.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* USB Printers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Usb className="h-5 w-5" />
                USB Printers
              </CardTitle>
              <CardDescription>
                Connect thermal printers via USB
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={handleScanUSB}
              disabled={isScanning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
              Scan USB
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {usbPrinters.length > 0 ? (
            <div className="space-y-2">
              {usbPrinters.map((printer, index) => (
                <div 
                  key={`${printer.vendorId}-${printer.productId}`}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Printer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{printer.name}</p>
                      <p className="text-xs text-muted-foreground">
                        VID: {printer.vendorId.toString(16).toUpperCase()} | 
                        PID: {printer.productId.toString(16).toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleAddUSBPrinter(printer)}>
                    Add
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Click "Scan USB" to detect connected printers
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configured Printers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configured Printers
              </CardTitle>
              <CardDescription>
                Manage your printer settings
              </CardDescription>
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowManualAdd(!showManualAdd)}
            >
              {showManualAdd ? 'Cancel' : 'Add Manually'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Add Form */}
          {showManualAdd && (
            <div className="p-4 border rounded-lg space-y-4 bg-muted/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Printer Name</Label>
                  <Input
                    placeholder="Kitchen Printer"
                    value={manualPrinter.name}
                    onChange={(e) => setManualPrinter(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={manualPrinter.type}
                    onValueChange={(value: 'usb' | 'network') => 
                      setManualPrinter(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="network">Network (IP)</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {manualPrinter.type === 'network' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={manualPrinter.ip}
                      onChange={(e) => setManualPrinter(prev => ({ ...prev, ip: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      placeholder="9100"
                      value={manualPrinter.port}
                      onChange={(e) => setManualPrinter(prev => ({ ...prev, port: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={manualPrinter.role}
                    onValueChange={(value: PrinterRole) => 
                      setManualPrinter(prev => ({ ...prev, role: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="counter">Counter (Bills)</SelectItem>
                      <SelectItem value="kitchen">Kitchen (KOT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paper Width</Label>
                  <Select
                    value={manualPrinter.format}
                    onValueChange={(value: PrintFormat) => 
                      setManualPrinter(prev => ({ ...prev, format: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80mm">80mm (Standard)</SelectItem>
                      <SelectItem value="76mm">76mm</SelectItem>
                      <SelectItem value="58mm">58mm (Compact)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAddManualPrinter} className="w-full">
                Add Printer
              </Button>
            </div>
          )}

          {/* Printer List */}
          {printers.length > 0 ? (
            <div className="space-y-3">
              {printers.map((printer) => (
                <div 
                  key={printer.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {printer.type === 'usb' ? (
                        <Usb className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Wifi className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{printer.name}</p>
                          <Badge variant={printer.role === 'kitchen' ? 'secondary' : 'default'}>
                            {printer.role}
                          </Badge>
                          {printer.isDefault && (
                            <Badge variant="outline">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {printer.type === 'network' 
                            ? `${printer.ipAddress}:${printer.port}`
                            : `USB Device`
                          } • {printer.format}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(printerStatus[printer.id] || 'unknown')}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleTestPrinter(printer)}
                      >
                        <TestTube className="h-4 w-4 mr-1" />
                        Test
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleRemovePrinter(printer.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Quick Settings */}
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Role:</Label>
                      <Select
                        value={printer.role}
                        onValueChange={(value: PrinterRole) => 
                          handleUpdatePrinter(printer.id, { role: value })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="counter">Counter</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Paper:</Label>
                      <Select
                        value={printer.format}
                        onValueChange={(value: PrintFormat) => 
                          handleUpdatePrinter(printer.id, { format: value })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80mm">80mm</SelectItem>
                          <SelectItem value="76mm">76mm</SelectItem>
                          <SelectItem value="58mm">58mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No printers configured. Scan for USB printers or add manually.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
