const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload - Exposes POSYTUDE USB printer APIs to React
 */

console.log('SpeedyBill POS: Preload loaded - POSYTUDE YHD-8330 mode');

contextBridge.exposeInMainWorld('electronAPI', {
  // List available printers
  listPrinters: () => ipcRenderer.invoke('printer:list'),

  // Discover POSYTUDE printer
  discoverPrinter: () => ipcRenderer.invoke('printer:discover'),

  // Print to USB (POSYTUDE)
  printToUSB: (vendorId, productId, data) =>
    ipcRenderer.invoke('printer:print-usb', { vendorId, productId, data }),

  // Test print
  testPrinter: (vendorId, productId) =>
    ipcRenderer.invoke('printer:test', { vendorId, productId }),

  // Open cash drawer
  openCashDrawer: (vendorId, productId) =>
    ipcRenderer.invoke('printer:open-drawer', { vendorId, productId }),

  // Get printer status
  getPrinterStatus: (vendorId, productId) =>
    ipcRenderer.invoke('printer:status', { vendorId, productId }),

  // Listen for printer discovery on startup
  onPrinterDiscovered: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('printer:discovered', handler);
    return () => ipcRenderer.removeListener('printer:discovered', handler);
  },

  // App info
  getVersion: () => ipcRenderer.invoke('app:version'),
  platform: process.platform,
  isWindows: process.platform === 'win32',
});

// Global flag for Electron detection
contextBridge.exposeInMainWorld('isElectronApp', true);
