import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSettingsStore } from '@/store/settingsStore';
import { discoverNetworkPrinters, discoverBluetoothPrinters } from '@/lib/printService';
import { toast } from 'sonner';
import { Printer, Search, Plus, Bluetooth, Wifi, Loader2, Trash2, Star } from 'lucide-react';
import type { PrinterRole, PrintFormat, PrinterType } from '@/types/settings';

interface DiscoveredPrinter {
  ip?: string;
  id?: string;
  name: string;
  port?: number;
  type: 'network' | 'bluetooth';
}

export function PrinterDiscovery() {
  const { printers, addPrinter, deletePrinter, setDefaultPrinter, loadPrinters } = useSettingsStore();
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'network' | 'bluetooth' | null>(null);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<DiscoveredPrinter[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDiscoveryResults, setShowDiscoveryResults] = useState(false);

  // Manual add form
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ipAddress: '',
    port: 9100,
    type: 'network' as PrinterType,
    role: 'counter' as PrinterRole,
    format: '76mm' as PrintFormat,
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

  const handleAddDiscovered = async (discovered: DiscoveredPrinter, role: PrinterRole) => {
    try {
      await addPrinter({
        name: discovered.name,
        ipAddress: discovered.ip || discovered.id || null,
        port: discovered.port || 9100,
        type: discovered.type,
        role,
        format: '76mm',
        isActive: true,
        isDefault: false,
      });
      toast.success(`Added ${discovered.name}`);
      loadPrinters();
    } catch (error) {
      toast.error('Failed to add printer');
    }
  };

  const handleManualAdd = async () => {
    if (!newPrinter.name || !newPrinter.ipAddress) {
      toast.error('Name and IP address are required');
      return;
    }

    try {
      await addPrinter({
        name: newPrinter.name,
        ipAddress: newPrinter.ipAddress,
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
        type: 'network',
        role: 'counter',
        format: '76mm',
      });
      loadPrinters();
    } catch (error) {
      toast.error('Failed to add printer');
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
          Discover and configure printers for KOT and bill printing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Discovery buttons */}
        <div className="flex gap-2">
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
              No printers configured. Scan or add one manually.
            </p>
          ) : (
            <div className="space-y-2">
              {printers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {p.type === 'bluetooth' ? (
                      <Bluetooth className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wifi className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {p.name}
                        {p.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.ipAddress}{p.port ? `:${p.port}` : ''} • {p.role} • {p.format}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
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
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.ip || p.id}{p.port ? `:${p.port}` : ''}
                      </p>
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
                  <Label>Format</Label>
                  <Select
                    value={newPrinter.format}
                    onValueChange={(v) => setNewPrinter({ ...newPrinter, format: v as PrintFormat })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58mm Thermal</SelectItem>
                      <SelectItem value="76mm">76mm Thermal</SelectItem>
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
