const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script - Securely exposes Electron APIs to the renderer process
 * This creates a bridge between the React app and Electron's Node.js capabilities
 */

console.log('SpeedyBill POS: Electron preload script loaded');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // ============================================
  // Printer Operations
  // ============================================

  /**
   * Get list of all available printers (USB and system printers)
   */
  listPrinters: () => ipcRenderer.invoke('printer:list'),

  /**
   * Discover all printers (USB + Network + System)
   * This is the main auto-discovery function
   */
  discoverPrinters: () => ipcRenderer.invoke('printer:discover'),

  /**
   * Quick network scan for printers
   */
  scanNetworkPrinters: () => ipcRenderer.invoke('printer:scan-network'),

  /**
   * Full network scan (slower but more thorough)
   */
  fullNetworkScan: () => ipcRenderer.invoke('printer:full-network-scan'),

  /**
   * Print to a USB thermal printer
   * @param {number} vendorId - USB vendor ID
   * @param {number} productId - USB product ID  
   * @param {Uint8Array|string} data - ESC/POS commands or raw data
   * @param {string} format - Paper format ('58mm', '76mm', '80mm')
   */
  printToUSB: (vendorId, productId, data, format) =>
    ipcRenderer.invoke('printer:print-usb', { vendorId, productId, data, format }),

  /**
   * Print to a network thermal printer
   * @param {string} ip - Printer IP address
   * @param {number} port - Printer port (usually 9100)
   * @param {Uint8Array|string} data - ESC/POS commands or raw data
   * @param {string} format - Paper format ('58mm', '76mm', '80mm')
   */
  printToNetwork: (ip, port, data, format) =>
    ipcRenderer.invoke('printer:print-network', { ip, port, data, format }),

  /**
   * Print to a system printer via Windows Print Spooler
   * @param {string} printerName - System printer name
   * @param {Uint8Array|string} data - ESC/POS commands or raw data
   */
  printToSystem: (printerName, data) =>
    ipcRenderer.invoke('printer:print-system', { printerName, data }),

  /**
   * Test printer connection
   * @param {string} type - 'usb' or 'network'
   * @param {object} config - Printer configuration
   */
  testPrinter: (type, config) =>
    ipcRenderer.invoke('printer:test', { type, config }),

  /**
   * Open cash drawer connected to printer
   * @param {string} type - 'usb' or 'network'
   * @param {object} config - Printer configuration
   */
  openCashDrawer: (type, config) =>
    ipcRenderer.invoke('printer:open-drawer', { type, config }),

  /**
   * Get printer status
   * @param {string} type - 'usb' or 'network'
   * @param {object} config - Printer configuration
   */
  getPrinterStatus: (type, config) =>
    ipcRenderer.invoke('printer:status', { type, config }),

  // ============================================
  // Auto-Discovery Events
  // ============================================

  /**
   * Listen for printer discovery results (called on app startup)
   */
  onPrintersDiscovered: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('printers:discovered', handler);
    return () => ipcRenderer.removeListener('printers:discovered', handler);
  },

  // ============================================
  // App Information
  // ============================================

  /**
   * Check if running inside Electron
   */
  // isElectron: () => ipcRenderer.invoke('app:is-electron'),

  /**
   * Get application version
   */
  getVersion: () => ipcRenderer.invoke('app:version'),

  // ============================================
  // Platform Information
  // ============================================

  platform: process.platform,
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
});

// Add a global flag that can be checked synchronously
contextBridge.exposeInMainWorld('isElectronApp', true);
