import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSettingsStore } from '@/store/settingsStore';
import { discoverNetworkPrinters, discoverBluetoothPrinters } from '@/lib/printService';
import { connectUSBPrinter, connectBluetoothPrinter } from '@/lib/escpos/printer';
import { useThermalPrint } from '@/hooks/useThermalPrint';
import { toast } from 'sonner';
import { Printer, Plus, Bluetooth, Wifi, Loader2, Trash2, Star, Usb, CircleDot, TestTube } from 'lucide-react';
import type { PrinterRole, PrintFormat, PrinterType, Printer as PrinterConfig } from '@/types/settings';

interface DiscoveredPrinter {
  ip?: string;
  id?: string;
  name: string;
  port?: number;
  type: 'network' | 'bluetooth' | 'usb';
}

export function PrinterDiscovery() {
  const { printers, addPrinter, deletePrinter, setDefaultPrinter, loadPrinters } = useSettingsStore();
  const { testPrint, checkPrinterStatus } = useThermalPrint();
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'network' | 'bluetooth' | 'usb' | null>(null);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

  // Manual add form
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ipAddress: '',
    port: 9100,
    type: 'usb' as PrinterType,
    role: 'counter' as PrinterRole,
    format: '80mm' as PrintFormat,
  });

  const handleNetworkScan = async () => {
    setIsScanning(true);
    setScanType('network');
    setDiscoveredPrinters([]);
    
    try {
      toast.info('Scanning network for printers...');
      const found = await discoverNetworkPrinters();
      
      const mapped: DiscoveredPrinter[] = found.map(p => ({
        ip: p.ip,
        name: p.name,
        port: p.port,
        type: 'network' as const,
      }));
      
      setDiscoveredPrinters(mapped);
      setShowDiscoveryResults(true);
      
      if (found.length === 0) {
        toast.info('No network printers found. Try adding manually.');
      } else {
        toast.success(`Found ${found.length} printer(s)`);
      }
    } catch (error) {
      console.error('Network scan error:', error);
      toast.error('Network scan failed');
    } finally {
      setIsScanning(false);
      setScanType(null);
    }
  };

  const handleBluetoothScan = async () => {
    setIsScanning(true);
    setScanType('bluetooth');
    setDiscoveredPrinters([]);
    
    try {
      toast.info('Scanning for Bluetooth printers...');
      const found = await discoverBluetoothPrinters();
      
      const mapped: DiscoveredPrinter[] = found.map(p => ({
        id: p.id,
        name: p.name,
        type: 'bluetooth' as const,
      }));
      
      setDiscoveredPrinters(mapped);
      setShowDiscoveryResults(true);
      
      if (found.length === 0) {
        toast.info('No Bluetooth printers found. Ensure pairing mode is active.');
      } else {
        toast.success(`Found ${found.length} printer(s)`);
      }
    } catch (error) {
      console.error('Bluetooth scan error:', error);
      toast.error('Bluetooth scan failed. Make sure Bluetooth is enabled.');
    } finally {
      setIsScanning(false);
      setScanType(null);
    }
  };

  const handleUSBConnect = async () => {
    setIsScanning(true);
    setScanType('usb');
    
    try {
      toast.info('Select USB printer from device picker...');
      const device = await connectUSBPrinter();
      
      if (device) {
        const discovered: DiscoveredPrinter = {
          id: `usb-${device.vendorId}-${device.productId}`,
          name: device.productName || `USB Printer (${device.vendorId})`,
          type: 'usb',
        };
        setDiscoveredPrinters([discovered]);
        setShowDiscoveryResults(true);
        toast.success('USB printer connected!');
      } else {
        toast.error('No USB printer selected or connection failed');
      }
    } catch (error) {
      console.error('USB connection error:', error);
      toast.error('USB connection failed. Make sure printer is connected.');
    } finally {
      setIsScanning(false);
      setScanType(null);
    }
  };

  const handleAddDiscovered = async (discovered: DiscoveredPrinter, role: PrinterRole) => {
    try {
      await addPrinter({
        name: discovered.name,
        ipAddress: discovered.ip || discovered.id || null,
        port: discovered.port || 9100,
        type: discovered.type,
        role,
        format: '80mm',
        isActive: true,
        isDefault: false,
      });
      toast.success(`Added ${discovered.name}`);
      setShowDiscoveryResults(false);
      loadPrinters();
    } catch (error) {
      toast.error('Failed to add printer');
    }
  };

  const handleManualAdd = async () => {
    if (!newPrinter.name) {
      toast.error('Printer name is required');
      return;
    }

    // For USB/Bluetooth, IP is not required
    if (newPrinter.type === 'network' && !newPrinter.ipAddress) {
      toast.error('IP address is required for network printers');
      return;
    }

    try {
      await addPrinter({
        name: newPrinter.name,
        ipAddress: newPrinter.type === 'network' ? newPrinter.ipAddress : null,
        port: newPrinter.port,
        type: newPrinter.type,
        role: newPrinter.role,
        format: newPrinter.format,
        isActive: true,
        isDefault: false,
      });
      toast.success('Printer added');
      setShowAddModal(false);
      setNewPrinter({
        name: '',
        ipAddress: '',
        port: 9100,
        type: 'usb',
        role: 'counter',
        format: '80mm',
      });
      loadPrinters();
    } catch (error) {
      toast.error('Failed to add printer');
    }
  };

  const handleTestPrint = async (printer: PrinterConfig) => {
    setTestingPrinterId(printer.id);
    try {
      toast.info(`Testing ${printer.name}...`);
      const result = await testPrint(printer);
      if (result.success) {
        toast.success('Test print sent successfully!');
      } else {
        toast.error(result.error || 'Test print failed');
      }
    } catch (error) {
      toast.error('Test print failed');
    } finally {
      setTestingPrinterId(null);
    }
  };

  const getPrinterIcon = (type: PrinterType) => {
    switch (type) {
      case 'usb': return <Usb className="h-4 w-4 text-muted-foreground" />;
      case 'bluetooth': return <Bluetooth className="h-4 w-4 text-muted-foreground" />;
      default: return <Wifi className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Printer Configuration
        </CardTitle>
        <CardDescription>
          Connect thermal printers for instant KOT and bill printing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discovery buttons */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleUSBConnect}
            disabled={isScanning}
          >
            {isScanning && scanType === 'usb' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Usb className="h-4 w-4 mr-2" />
            )}
            Connect USB
          </Button>

          <Button
            variant="outline"
            onClick={handleBluetoothScan}
            disabled={isScanning}
          >
            {isScanning && scanType === 'bluetooth' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bluetooth className="h-4 w-4 mr-2" />
            )}
            Scan Bluetooth
          </Button>
          
          <Button
            variant="outline"
            onClick={handleNetworkScan}
            disabled={isScanning}
          >
            {isScanning && scanType === 'network' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4 mr-2" />
            )}
            Scan Network
          </Button>

          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manually
          </Button>
        </div>

        {/* Configured printers */}
        <div className="space-y-2">
          <Label>Configured Printers</Label>
          {printers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No printers configured. Connect USB or add one manually.
            </p>
          ) : (
            <div className="space-y-2">
              {printers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPrinterIcon(p.type)}
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {p.name}
                        {p.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        <CircleDot className={`h-3 w-3 ${checkPrinterStatus(p.id) ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.type.toUpperCase()} • {p.role} • {p.format}
                        {p.ipAddress && ` • ${p.ipAddress}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestPrint(p)}
                      disabled={testingPrinterId === p.id}
                    >
                      {testingPrinterId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                    </Button>
                    {!p.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultPrinter(p.id, p.role)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePrinter(p.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Discovery results dialog */}
        <Dialog open={showDiscoveryResults} onOpenChange={setShowDiscoveryResults}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Discovered Printers</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-64 overflow-auto">
              {discoveredPrinters.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No printers found
                </p>
              ) : (
                discoveredPrinters.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getPrinterIcon(p.type)}
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.type.toUpperCase()}{p.ip ? ` • ${p.ip}` : ''}{p.port ? `:${p.port}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handleAddDiscovered(p, 'kitchen')}>
                        Kitchen
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAddDiscovered(p, 'counter')}>
                        Counter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleAddDiscovered(p, 'bar')}>
                        Bar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Manual add dialog */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Printer Manually</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Printer Name</Label>
                <Input
                  placeholder="Kitchen Printer"
                  value={newPrinter.name}
                  onChange={(e) => setNewPrinter({ ...newPrinter, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Connection Type</Label>
                <Select
                  value={newPrinter.type}
                  onValueChange={(v) => setNewPrinter({ ...newPrinter, type: v as PrinterType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usb">USB Direct</SelectItem>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    <SelectItem value="network">Network (IP)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newPrinter.type === 'network' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>IP Address</Label>
                    <Input
                      placeholder="192.168.1.100"
                      value={newPrinter.ipAddress}
                      onChange={(e) => setNewPrinter({ ...newPrinter, ipAddress: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={newPrinter.port}
                      onChange={(e) => setNewPrinter({ ...newPrinter, port: parseInt(e.target.value) || 9100 })}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={newPrinter.role}
                    onValueChange={(v) => setNewPrinter({ ...newPrinter, role: v as PrinterRole })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen">Kitchen</SelectItem>
                      <SelectItem value="counter">Counter</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select
                    value={newPrinter.format}
                    onValueChange={(v) => setNewPrinter({ ...newPrinter, format: v as PrintFormat })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm Thermal</SelectItem>
                      <SelectItem value="76mm">76mm Thermal</SelectItem>
                      <SelectItem value="80mm">80mm Thermal</SelectItem>
                      <SelectItem value="a5">A5</SelectItem>
                      <SelectItem value="a4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button onClick={handleManualAdd}>Add Printer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
