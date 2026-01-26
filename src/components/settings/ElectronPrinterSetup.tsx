import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Printer,
  Usb,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Monitor,
  Download,
  TestTube,
  HelpCircle
} from 'lucide-react';
import { usePosytudePrinter } from '@/hooks/usePosytudePrinter';
import { isElectron } from '@/lib/electron';

/**
 * POSYTUDE YHD-8330 USB Printer Setup
 * Simplified to support only this single USB printer for both KOT and Bill printing
 */
export const ElectronPrinterSetup: React.FC = () => {
  const { 
    isElectron: isElectronEnv, 
    printer, 
    status, 
    isConnected,
    discoverPrinter, 
    testPrint, 
    refreshStatus 
  } = usePosytudePrinter();
  
  const [isScanning, setIsScanning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const result = await discoverPrinter();
      if (result) {
        toast.success('Printer found!', { description: result.name });
      } else {
        toast.error('No printer found', { 
          description: 'Connect POSYTUDE printer and try again' 
        });
      }
    } catch (error) {
      toast.error('Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestPrint = async () => {
    setIsTesting(true);
    toast.loading('Printing test page...', { id: 'test-print' });

    try {
      const result = await testPrint();
      if (result.success) {
        toast.success('Test print successful!', { id: 'test-print' });
      } else {
        toast.error(`Test failed: ${result.error}`, { id: 'test-print' });
      }
    } catch (error) {
      toast.error('Test print failed', { id: 'test-print' });
    } finally {
      setIsTesting(false);
    }
  };

  // Not in Electron - show download notice
  if (!isElectronEnv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Desktop App Required
          </CardTitle>
          <CardDescription>
            For USB printing, download the SpeedyBill desktop application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Browser Limitations</AlertTitle>
            <AlertDescription>
              Web browsers cannot access USB printers directly. The desktop app provides:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Direct POSYTUDE YHD-8330 USB support</li>
                <li>Silent printing (no dialogs)</li>
                <li>Auto-print receipts and KOTs</li>
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

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">Installation Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Download the installer (.exe file)</li>
              <li>Run the installer as Administrator</li>
              <li>Connect POSYTUDE printer via USB</li>
              <li>Launch SpeedyBill POS</li>
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
            POSYTUDE YHD-8330 USB thermal printer support enabled
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Printer Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Usb className="h-5 w-5" />
                POSYTUDE YHD-8330
              </CardTitle>
              <CardDescription>
                Single USB printer for KOT and Bill printing
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={handleScan}
              disabled={isScanning}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Detect Printer'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          <div className={`p-4 rounded-lg ${
            isConnected ? 'bg-green-500/10' : 'bg-orange-500/10'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isConnected ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-orange-500" />
                )}
                <div>
                  <p className="font-medium">
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status.message || (isConnected ? 'Ready to print' : 'Connect USB printer')}
                  </p>
                </div>
              </div>
              {isConnected && (
                <Button
                  variant="outline"
                  onClick={handleTestPrint}
                  disabled={isTesting}
                >
                  <TestTube className={`h-4 w-4 mr-2 ${isTesting ? 'animate-pulse' : ''}`} />
                  Test Print
                </Button>
              )}
            </div>
          </div>

          {/* Printer Details */}
          {printer && (
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{printer.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paper Format</p>
                <p className="font-medium">{printer.format}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vendor ID</p>
                <p className="font-mono text-sm">0x{printer.vendorId.toString(16).padStart(4, '0')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product ID</p>
                <p className="font-mono text-sm">0x{printer.productId.toString(16).padStart(4, '0')}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground">Usage</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="default">Counter Bills</Badge>
                  <Badge variant="secondary">Kitchen KOT</Badge>
                </div>
              </div>
            </div>
          )}

          {/* Troubleshooting */}
          {!isConnected && status.troubleshooting && (
            <Alert>
              <HelpCircle className="h-4 w-4" />
              <AlertTitle>Troubleshooting</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {status.troubleshooting.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Not Connected Help */}
          {!printer && (
            <div className="text-center py-6 text-muted-foreground">
              <Printer className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No Printer Detected</p>
              <p className="text-sm mt-1">
                Connect your POSYTUDE YHD-8330 via USB and click "Detect Printer"
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supported Printer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <Printer className="h-8 w-8" />
            </div>
            <div>
              <p className="font-medium">POSYTUDE YHD-8330</p>
              <p className="text-sm text-muted-foreground">
                80mm USB Thermal Receipt Printer
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This printer handles both KOT (Kitchen) and Bill printing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
