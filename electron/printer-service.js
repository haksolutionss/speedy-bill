const net = require('net');
const os = require('os');

/**
 * PrinterService - Handles all printer operations in Electron main process
 * Supports USB and Network thermal printers with ESC/POS commands
 * Includes auto-discovery for both USB and network printers
 */
class PrinterService {
  constructor() {
    this.connectedDevices = new Map();
    this.PRINTER_PORT = 9100; // Default thermal printer port
    this.usbModule = null;
    this.initUSBModule();
  }

  /**
   * Initialize USB module with graceful fallback
   * The USB module is optional - network printing works without it
   */
  initUSBModule() {
    try {
      // Try to load USB module - may fail in packaged app or without native bindings
      this.usbModule = require('usb');
      console.log('USB module loaded successfully');
    } catch (error) {
      console.warn('USB module not available:', error.message);
      console.warn('USB printer support will be disabled. Network printers still work.');
      this.usbModule = null;
    }
  }

  // ============================================
  // Auto-Discovery System (USB ONLY)
  // ============================================

  /**
   * Discover USB printers only
   * Network and System printers are commented out for simplicity
   */
  async discoverAllPrinters() {
    console.log('Starting USB printer discovery...');
    
    const usbResult = await this.listUSBPrintersAsync();

    console.log(`Discovery complete: Found ${usbResult.printers.length} USB printer(s)`);
    console.log('USB Printers:', JSON.stringify(usbResult.printers, null, 2));
    
    return {
      success: true,
      printers: usbResult.printers,
      counts: {
        usb: usbResult.printers.length,
        network: 0,
        system: 0
      }
    };
  }

  // COMMENTED OUT - Network and System printer discovery
  // We're focusing on USB only for posytude printer
  /*
  async getSystemPrinters() {
    return { printers: [] };
  }

  async quickNetworkScan(timeout = 500) {
    // Network scan disabled - USB only
    return { success: true, printers: [] };
  }
  */

  // COMMENTED OUT - Full network scan
  // We're focusing on USB only for posytude printer
  /*
  async fullNetworkScan(timeout = 300) {
    return { success: true, printers: [] };
  }

  getLocalNetworks() {
    return [];
  }

  checkPrinterPort(ip, port, timeout = 500) {
    return Promise.resolve(null);
  }
  */

  // ============================================
  // USB Printer Operations
  // ============================================

  /**
   * List all available USB printers (async version)
   */
  async listUSBPrintersAsync() {
    try {
      const printers = this.listUSBPrinters();
      return { success: true, printers };
    } catch (error) {
      console.error('Error listing USB printers:', error);
      return { success: false, printers: [], error: error.message };
    }
  }

  /**
   * List all available USB printers
   */
  async listPrinters() {
    try {
      const usbPrinters = this.listUSBPrinters();
      return {
        success: true,
        printers: usbPrinters
      };
    } catch (error) {
      console.error('Error listing printers:', error);
      return {
        success: false,
        error: error.message,
        printers: []
      };
    }
  }

  /**
   * Get all USB devices that look like printers
   * Enhanced to detect posytude and similar thermal printers
   */
  listUSBPrinters() {
    if (!this.usbModule) {
      console.log('USB module not available');
      return [];
    }

    try {
      const devices = this.usbModule.getDeviceList();
      const printers = [];

      console.log(`Found ${devices.length} USB devices total`);

      // Common thermal printer vendor IDs (including posytude)
      const printerVendors = [
        0x0416, // Winbond (posytude and many other thermal printers)
        0x0483, // STMicroelectronics (common in POS printers)
        0x04b8, // EPSON
        0x0519, // Star Micronics
        0x0525, // PLX Technology
        0x067b, // Prolific (USB-Serial adapters)
        0x0dd4, // Custom Engineering
        0x0fe6, // ICS Advent
        0x1504, // EPSON (alternate)
        0x154f, // SNBC
        0x1659, // SII (Seiko)
        0x1a86, // QinHeng Electronics (CH340/CH341)
        0x1fc9, // NXP
        0x20d1, // Simba
        0x2730, // Citizen
        0x28e9, // GD32
        0x4b43, // Custom (alternate)
        0x6868, // Cashino
        0x0fe6, // Kontron
        0x0471, // Philips (some POS devices)
        0x1234, // Generic USB device (common placeholder)
      ];

      for (const device of devices) {
        const descriptor = device.deviceDescriptor;
        const vendorIdHex = descriptor.idVendor.toString(16).padStart(4, '0');
        const productIdHex = descriptor.idProduct.toString(16).padStart(4, '0');
        
        // Check if it's a known printer vendor or has printer class
        const isPrinterVendor = printerVendors.includes(descriptor.idVendor);
        const isPrinterClass = descriptor.bDeviceClass === 7; // Printer class
        
        // Log all devices for debugging
        console.log(`USB Device: VID=${vendorIdHex} PID=${productIdHex} Class=${descriptor.bDeviceClass} isPrinterVendor=${isPrinterVendor}`);
        
        if (isPrinterVendor || isPrinterClass) {
          let manufacturer = '';
          let product = '';
          let deviceOpened = false;
          
          try {
            device.open();
            deviceOpened = true;
            
            try {
              if (descriptor.iManufacturer) {
                manufacturer = device.getStringDescriptor(descriptor.iManufacturer) || '';
              }
              if (descriptor.iProduct) {
                product = device.getStringDescriptor(descriptor.iProduct) || '';
              }
            } catch (e) {
              console.log(`Could not get string descriptors for ${vendorIdHex}:${productIdHex}`);
            }
            
            device.close();
            deviceOpened = false;
            
            const printerInfo = {
              vendorId: descriptor.idVendor,
              productId: descriptor.idProduct,
              manufacturer,
              product,
              name: product || manufacturer || `USB Printer (${vendorIdHex}:${productIdHex})`,
              type: 'usb',
              status: 'connected'
            };
            
            console.log('✓ Found USB Printer:', printerInfo);
            printers.push(printerInfo);
            
          } catch (e) {
            // Device might be in use or inaccessible - still add it
            if (deviceOpened) {
              try { device.close(); } catch {}
            }
            
            const printerInfo = {
              vendorId: descriptor.idVendor,
              productId: descriptor.idProduct,
              manufacturer: 'Unknown',
              product: 'Unknown',
              name: `USB Printer (${vendorIdHex}:${productIdHex})`,
              type: 'usb',
              status: 'in-use'
            };
            
            console.log('⚠ USB Printer (in use):', printerInfo, 'Error:', e.message);
            printers.push(printerInfo);
          }
        }
      }

      console.log(`Total USB printers found: ${printers.length}`);
      return printers;
    } catch (error) {
      console.error('Error listing USB printers:', error);
      return [];
    }
  }

  /**
   * Print to USB printer
   */
  async printToUSB(vendorId, productId, data, format = '80mm') {
    if (!this.usbModule) {
      return { success: false, error: 'USB module not available. Please use network printers.' };
    }

    return new Promise((resolve) => {
      try {
        const device = this.usbModule.findByIds(vendorId, productId);
        
        if (!device) {
          resolve({ success: false, error: 'USB printer not found' });
          return;
        }

        device.open();

        // Get the printer interface (usually interface 0)
        const iface = device.interfaces[0];
        
        if (!iface) {
          device.close();
          resolve({ success: false, error: 'No printer interface found' });
          return;
        }

        // Detach kernel driver if necessary (Linux)
        if (iface.isKernelDriverActive && iface.isKernelDriverActive()) {
          iface.detachKernelDriver();
        }

        iface.claim();

        // Find the OUT endpoint (for sending data to printer)
        let outEndpoint = null;
        for (const endpoint of iface.endpoints) {
          if (endpoint.direction === 'out') {
            outEndpoint = endpoint;
            break;
          }
        }

        if (!outEndpoint) {
          iface.release(() => device.close());
          resolve({ success: false, error: 'No output endpoint found' });
          return;
        }

        // Convert data to Buffer if needed
        const buffer = this.toBuffer(data);

        // Send data to printer
        outEndpoint.transfer(buffer, (error) => {
          iface.release(() => device.close());
          
          if (error) {
            console.error('USB transfer error:', error);
            resolve({ success: false, error: error.message });
          } else {
            console.log('USB print successful');
            resolve({ success: true });
          }
        });

      } catch (error) {
        console.error('USB print error:', error);
        resolve({ success: false, error: error.message });
      }
    });
  }

  // ============================================
  // Network Printer Operations
  // ============================================

  /**
   * Print to network printer via TCP socket
   */
  async printToNetwork(ip, port = 9100, data, format = '80mm') {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = 10000; // 10 second timeout

      // Set timeout
      socket.setTimeout(timeout);

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });

      socket.on('error', (error) => {
        console.error('Network printer error:', error);
        resolve({ success: false, error: error.message });
      });

      socket.connect(port, ip, () => {
        console.log(`Connected to printer at ${ip}:${port}`);
        
        // Convert data to Buffer if needed
        const buffer = this.toBuffer(data);
        
        socket.write(buffer, () => {
          // Small delay before closing to ensure data is sent
          setTimeout(() => {
            socket.end();
            console.log('Network print successful');
            resolve({ success: true });
          }, 100);
        });
      });
    });
  }

  // ============================================
  // Test & Status Operations
  // ============================================

  /**
   * Test printer connection with a test page
   */
  async testPrinter(type, config) {
    // Generate test print ESC/POS commands
    const testCommands = this.generateTestPrint();
    
    if (type === 'usb') {
      return this.printToUSB(config.vendorId, config.productId, testCommands);
    } else if (type === 'network') {
      return this.printToNetwork(config.ip, config.port || 9100, testCommands);
    }
    
    return { success: false, error: 'Invalid printer type' };
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(type, config) {
    // ESC/POS cash drawer command
    const drawerCommand = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    
    if (type === 'usb') {
      return this.printToUSB(config.vendorId, config.productId, drawerCommand);
    } else if (type === 'network') {
      return this.printToNetwork(config.ip, config.port || 9100, drawerCommand);
    }
    
    return { success: false, error: 'Invalid printer type' };
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(type, config) {
    if (type === 'usb') {
      if (!this.usbModule) {
        return { success: true, status: 'unavailable' };
      }
      try {
        const device = this.usbModule.findByIds(config.vendorId, config.productId);
        if (device) {
          return { success: true, status: 'connected' };
        }
        return { success: true, status: 'disconnected' };
      } catch (error) {
        return { success: false, status: 'error', error: error.message };
      }
    } else if (type === 'network') {
      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);
        
        socket.on('connect', () => {
          socket.destroy();
          resolve({ success: true, status: 'connected' });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          resolve({ success: true, status: 'timeout' });
        });
        
        socket.on('error', () => {
          resolve({ success: true, status: 'disconnected' });
        });
        
        socket.connect(config.port || 9100, config.ip);
      });
    }
    
    return { success: false, status: 'unknown' };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Convert various data types to Buffer
   */
  toBuffer(data) {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    if (data instanceof Uint8Array) {
      return Buffer.from(data);
    }
    if (typeof data === 'string') {
      // Check if it's base64 encoded
      if (this.isBase64(data)) {
        return Buffer.from(data, 'base64');
      }
      return Buffer.from(data);
    }
    if (Array.isArray(data)) {
      return Buffer.from(data);
    }
    throw new Error('Unsupported data type');
  }

  /**
   * Check if string is base64 encoded
   */
  isBase64(str) {
    if (typeof str !== 'string') return false;
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (e) {
      return false;
    }
  }

  /**
   * Generate test print ESC/POS commands
   */
  generateTestPrint() {
    const ESC = 0x1B;
    const GS = 0x1D;
    
    const commands = [
      // Initialize printer
      ESC, 0x40,
      // Center align
      ESC, 0x61, 0x01,
      // Double size text
      GS, 0x21, 0x11,
    ];
    
    // Add text
    const title = 'SPEEDYBILL POS\n';
    const subtitle = 'Test Print\n';
    const line = '--------------------------------\n';
    const timestamp = `${new Date().toLocaleString()}\n`;
    const success = 'Printer Connected Successfully!\n';
    
    // Convert strings to bytes
    for (const char of title) commands.push(char.charCodeAt(0));
    
    // Normal size
    commands.push(GS, 0x21, 0x00);
    for (const char of subtitle) commands.push(char.charCodeAt(0));
    
    // Left align
    commands.push(ESC, 0x61, 0x00);
    for (const char of line) commands.push(char.charCodeAt(0));
    for (const char of `Time: ${timestamp}`) commands.push(char.charCodeAt(0));
    for (const char of line) commands.push(char.charCodeAt(0));
    
    // Center align
    commands.push(ESC, 0x61, 0x01);
    for (const char of success) commands.push(char.charCodeAt(0));
    
    // Feed and cut
    commands.push(ESC, 0x64, 0x04); // Feed 4 lines
    commands.push(GS, 0x56, 0x00); // Full cut
    
    return Buffer.from(commands);
  }
}

module.exports = PrinterService;
