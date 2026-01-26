/**
 * PrinterService - POSYTUDE YHD-8330 USB Thermal Printer
 * Simplified to support ONLY this single USB printer for both KOT and Bill printing
 */
class PrinterService {
  constructor() {
    this.usbModule = null;
    this.cachedPrinter = null;
    
    // POSYTUDE YHD-8330 identifiers
    this.POSYTUDE_VENDOR_ID = 0x0416; // Winbond (posytude uses this)
    
    this.initUSBModule();
  }

  /**
   * Initialize USB module
   */
  initUSBModule() {
    try {
      this.usbModule = require('usb');
      console.log('✓ USB module loaded - POSYTUDE printer support enabled');
    } catch (error) {
      console.error('✗ USB module not available:', error.message);
      this.usbModule = null;
    }
  }

  /**
   * Find the POSYTUDE printer
   * Returns the first matching USB thermal printer
   */
  findPosytudePrinter() {
    if (!this.usbModule) {
      return null;
    }

    try {
      const devices = this.usbModule.getDeviceList();
      
      // Known thermal printer vendor IDs (prioritize POSYTUDE/Winbond)
      const thermalVendors = [
        0x0416, // Winbond - POSYTUDE YHD-8330
        0x04b8, // EPSON
        0x0519, // Star Micronics
        0x1a86, // QinHeng (CH340)
        0x0483, // STMicroelectronics
      ];

      for (const device of devices) {
        const { idVendor, idProduct } = device.deviceDescriptor;
        
        if (thermalVendors.includes(idVendor)) {
          let name = 'POSYTUDE YHD-8330';
          let manufacturer = 'POSYTUDE';
          
          try {
            device.open();
            if (device.deviceDescriptor.iProduct) {
              name = device.getStringDescriptor(device.deviceDescriptor.iProduct) || name;
            }
            if (device.deviceDescriptor.iManufacturer) {
              manufacturer = device.getStringDescriptor(device.deviceDescriptor.iManufacturer) || manufacturer;
            }
            device.close();
          } catch (e) {
            // Device in use - that's okay
          }

          const printer = {
            vendorId: idVendor,
            productId: idProduct,
            name,
            manufacturer,
            type: 'usb',
            status: 'connected'
          };

          console.log('✓ Found POSYTUDE printer:', printer);
          this.cachedPrinter = printer;
          return printer;
        }
      }

      console.log('✗ No POSYTUDE printer found');
      return null;
    } catch (error) {
      console.error('Error finding printer:', error);
      return null;
    }
  }

  /**
   * List printers - returns single POSYTUDE printer if found
   */
  async listPrinters() {
    const printer = this.findPosytudePrinter();
    return {
      success: true,
      printers: printer ? [printer] : []
    };
  }

  /**
   * Discover printers on startup
   */
  async discoverPrinters() {
    const printer = this.findPosytudePrinter();
    return {
      success: true,
      printer: printer,
      printers: printer ? [{ ...printer, type: 'usb' }] : []
    };
  }

  /**
   * Print to the POSYTUDE USB printer
   */
  async printToUSB(vendorId, productId, data) {
    if (!this.usbModule) {
      return { 
        success: false, 
        error: 'USB module not available. Reinstall the application.',
        troubleshooting: ['Reinstall SpeedyBill POS', 'Check if antivirus is blocking USB access']
      };
    }

    return new Promise((resolve) => {
      try {
        const device = this.usbModule.findByIds(vendorId, productId);
        
        if (!device) {
          resolve({ 
            success: false, 
            error: 'Printer not found. Check connection.',
            troubleshooting: [
              'Ensure the USB cable is securely connected',
              'Check if the printer is powered ON',
              'Try a different USB port',
              'Restart the application'
            ]
          });
          return;
        }

        device.open();

        const iface = device.interfaces[0];
        if (!iface) {
          device.close();
          resolve({ 
            success: false, 
            error: 'Printer interface not available',
            troubleshooting: ['Restart the printer', 'Reconnect USB cable']
          });
          return;
        }

        // Detach kernel driver if needed (Linux)
        if (iface.isKernelDriverActive && iface.isKernelDriverActive()) {
          iface.detachKernelDriver();
        }

        iface.claim();

        // Find OUT endpoint
        let outEndpoint = null;
        for (const endpoint of iface.endpoints) {
          if (endpoint.direction === 'out') {
            outEndpoint = endpoint;
            break;
          }
        }

        if (!outEndpoint) {
          iface.release(() => device.close());
          resolve({ 
            success: false, 
            error: 'Printer endpoint not found',
            troubleshooting: ['Restart printer', 'Try different USB port']
          });
          return;
        }

        // Convert to buffer
        const buffer = this.toBuffer(data);

        // Send to printer
        outEndpoint.transfer(buffer, (error) => {
          iface.release(() => device.close());
          
          if (error) {
            console.error('Print transfer error:', error);
            resolve({ 
              success: false, 
              error: error.message,
              troubleshooting: ['Check paper roll', 'Restart printer']
            });
          } else {
            console.log('✓ Print successful');
            resolve({ success: true });
          }
        });

      } catch (error) {
        console.error('USB print error:', error);
        resolve({ 
          success: false, 
          error: error.message,
          troubleshooting: [
            'Restart the application',
            'Reconnect the printer',
            'Check USB cable'
          ]
        });
      }
    });
  }

  /**
   * Get printer status
   */
  async getPrinterStatus(vendorId, productId) {
    if (!this.usbModule) {
      return { 
        success: false, 
        status: 'unavailable',
        message: 'USB support not available',
        troubleshooting: ['Reinstall SpeedyBill POS']
      };
    }

    try {
      const device = this.usbModule.findByIds(vendorId, productId);
      
      if (device) {
        return { 
          success: true, 
          status: 'connected',
          message: 'Printer is ready'
        };
      } else {
        return { 
          success: true, 
          status: 'disconnected',
          message: 'Printer not found',
          troubleshooting: [
            'Check USB cable connection',
            'Ensure printer is powered ON',
            'Try a different USB port'
          ]
        };
      }
    } catch (error) {
      return { 
        success: false, 
        status: 'error',
        message: error.message,
        troubleshooting: ['Restart the application']
      };
    }
  }

  /**
   * Test print
   */
  async testPrinter(vendorId, productId) {
    const commands = this.generateTestPrint();
    return this.printToUSB(vendorId, productId, commands);
  }

  /**
   * Open cash drawer
   */
  async openCashDrawer(vendorId, productId) {
    // ESC/POS cash drawer command
    const command = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
    return this.printToUSB(vendorId, productId, command);
  }

  /**
   * Generate test print
   */
  generateTestPrint() {
    const ESC = 0x1B;
    const GS = 0x1D;
    
    const commands = [
      ESC, 0x40,           // Initialize
      ESC, 0x61, 0x01,     // Center align
      GS, 0x21, 0x11,      // Double size
    ];
    
    const title = 'SPEEDYBILL POS\n';
    const line = '--------------------------------\n';
    const model = 'POSYTUDE YHD-8330\n';
    const status = 'Printer Connected!\n';
    const time = `${new Date().toLocaleString()}\n`;
    
    const text = title + line + model + status + time + line + '\n\n\n';
    
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    
    // Cut command
    const cut = [GS, 0x56, 0x42, 0x00];
    
    return Buffer.concat([
      Buffer.from(commands),
      Buffer.from(textBytes),
      Buffer.from(cut)
    ]);
  }

  /**
   * Convert data to Buffer
   */
  toBuffer(data) {
    if (Buffer.isBuffer(data)) return data;
    if (data instanceof Uint8Array) return Buffer.from(data);
    if (typeof data === 'string') {
      try {
        return Buffer.from(data, 'base64');
      } catch {
        return Buffer.from(data);
      }
    }
    if (Array.isArray(data)) return Buffer.from(data);
    throw new Error('Unsupported data type');
  }
}

module.exports = PrinterService;
