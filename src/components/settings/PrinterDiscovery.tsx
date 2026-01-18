import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSettingsStore } from '@/store/settingsStore';
import { usePrintQueue } from '@/hooks/usePrintQueue';
import { toast } from 'sonner';
import { 
  Printer, Plus, Wifi, Loader2, Trash2, Star, 
  CircleDot, TestTube, Download, RefreshCw, CheckCircle2, XCircle 
} from 'lucide-react';
import type { PrinterRole, PrintFormat, Printer as PrinterConfig } from '@/types/settings';

export function PrinterDiscovery() {
  const { printers, addPrinter, deletePrinter, setDefaultPrinter, loadPrinters } = useSettingsStore();
  const { testPrint, agentStatus, refreshAgentStatus, isChecking } = usePrintQueue();
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

  // Manual add form
  const [newPrinter, setNewPrinter] = useState({
    name: '',
    ipAddress: '',
    port: 9100,
    role: 'counter' as PrinterRole,
    format: '80mm' as PrintFormat,
  });

  const handleManualAdd = async () => {
    if (!newPrinter.name) {
      toast.error('Printer name is required');
      return;
    }

    if (!newPrinter.ipAddress) {
      toast.error('IP address is required');
      return;
    }

    try {
      await addPrinter({
        name: newPrinter.name,
        ipAddress: newPrinter.ipAddress,
        port: newPrinter.port,
        type: 'network',
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
      toast.info(`Sending test print to ${printer.role} printer...`);
      const result = await testPrint(printer.role as 'counter' | 'kitchen' | 'bar');
      if (result.success) {
        toast.success('Test print queued! Check printer.');
      } else {
        toast.error(result.error || 'Test print failed');
      }
    } catch (error) {
      toast.error('Test print failed');
    } finally {
      setTestingPrinterId(null);
    }
  };

  const handleDownloadAgent = () => {
    // Open the agent folder in a new tab for download
    window.open('/pos-print-agent/README.md', '_blank');
    toast.info('Download the agent files and run: npm install && npm start');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-5 w-5" />
          Printer Configuration
        </CardTitle>
        <CardDescription>
          Configure thermal printers via the Local Print Agent.
          Add printer IP addresses and the agent handles the connection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Agent Status */}
        <Alert className={agentStatus.available ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {agentStatus.available ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-yellow-500" />
              )}
              <AlertDescription>
                {agentStatus.available ? (
                  <>
                    <span className="font-medium">Print Agent Connected</span>
                    <span className="text-muted-foreground ml-2">
                      ({agentStatus.agentId}) • {agentStatus.printers?.join(', ') || 'No printers'}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Print Agent Not Running</span>
                    <span className="text-muted-foreground ml-2">
                      Download and run the agent on your POS machine
                    </span>
                  </>
                )}
              </AlertDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshAgentStatus}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
              {!agentStatus.available && (
                <Button variant="outline" size="sm" onClick={handleDownloadAgent}>
                  <Download className="h-4 w-4 mr-2" />
                  Get Agent
                </Button>
              )}
            </div>
          </div>
        </Alert>

        {/* Add Printer Button */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Printer
          </Button>
        </div>

        {/* Configured printers */}
        <div className="space-y-2">
          <Label>Configured Printers</Label>
          {printers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No printers configured. Add a network printer to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {printers.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {p.name}
                        {p.isDefault && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                        <CircleDot className={`h-3 w-3 ${agentStatus.available ? 'text-green-500' : 'text-muted-foreground'}`} />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.role} • {p.format}
                        {p.ipAddress && ` • ${p.ipAddress}:${p.port}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestPrint(p)}
                      disabled={testingPrinterId === p.id || !agentStatus.available}
                      title={!agentStatus.available ? 'Start Print Agent first' : 'Send test print'}
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

        {/* Manual add dialog */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Network Printer</DialogTitle>
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

              <p className="text-sm text-muted-foreground">
                The printer must be accessible from the machine running the Print Agent.
                Common thermal printer port is 9100.
              </p>
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
