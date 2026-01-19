const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;
let printerService;

// Disable hardware acceleration for better compatibility
app.disableHardwareAcceleration();

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    icon: path.join(__dirname, 'assets/icon.ico'),
    title: 'SpeedyBill POS',
    show: true, // Don't show until ready
    backgroundColor: '#0a0a0b',
  });

  // Initialize printer service (lazy load to handle missing usb module gracefully)
  try {
    const PrinterService = require('./printer-service');
    printerService = new PrinterService();
  } catch (error) {
    console.error('Failed to initialize printer service:', error.message);
    // Create a mock printer service for development
    printerService = {
      listPrinters: async () => ({ success: true, printers: [] }),
      printToUSB: async () => ({ success: false, error: 'USB module not available' }),
      printToNetwork: async (ip, port, data) => {
        const net = require('net');
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(10000);
          socket.on('timeout', () => { socket.destroy(); resolve({ success: false, error: 'Connection timeout' }); });
          socket.on('error', (err) => { resolve({ success: false, error: err.message }); });
          socket.connect(port, ip, () => {
            socket.write(Buffer.from(data), () => {
              setTimeout(() => { socket.end(); resolve({ success: true }); }, 100);
            });
          });
        });
      },
      testPrinter: async () => ({ success: false, error: 'Printer service not initialized' }),
      openCashDrawer: async () => ({ success: false, error: 'Printer service not initialized' }),
      getPrinterStatus: async () => ({ success: true, status: 'unknown' }),
    };
  }

  // Determine if we're in development or production
  const isDev = !app.isPackaged;

  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(process.resourcesPath, 'app.asar/dist/index.html');
    console.log('Loading production app from:', indexPath);
    mainWindow.loadFile(indexPath);

  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle load failures
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
    if (isDev) {
      // In dev, retry loading after a delay (Vite might still be starting)
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:8080');
      }, 2000);
    }
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.reload() },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Toggle Fullscreen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About SpeedyBill POS', click: () => showAboutDialog() }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showAboutDialog() {
  const { dialog } = require('electron');
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About SpeedyBill POS',
    message: 'SpeedyBill POS',
    detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nChromium: ${process.versions.chrome}\n\nA professional Point of Sale system with thermal printer support.`,
    buttons: ['OK']
  });
}

// App lifecycle events
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC Handlers for Printer Communication
// ============================================

// Get list of available printers (includes system printers)
ipcMain.handle('printer:list', async () => {
  try {
    // Get USB printers from our service
    const usbResult = await printerService.listPrinters();

    // Also get system printers (for WiFi/network printers detected by OS)
    const systemPrinters = mainWindow ? mainWindow.webContents.getPrintersAsync() : Promise.resolve([]);
    const sysPrinters = await systemPrinters;

    const allPrinters = [
      ...(usbResult.printers || []),
      ...sysPrinters.map(p => ({
        name: p.name,
        type: 'system',
        displayName: p.displayName,
        isDefault: p.isDefault,
        status: p.status
      }))
    ];

    return { success: true, printers: allPrinters };
  } catch (error) {
    console.error('Error listing printers:', error);
    return { success: false, error: error.message, printers: [] };
  }
});

// Print to USB printer
ipcMain.handle('printer:print-usb', async (event, { vendorId, productId, data, format }) => {
  try {
    const result = await printerService.printToUSB(vendorId, productId, data, format);
    return result;
  } catch (error) {
    console.error('USB print error:', error);
    return { success: false, error: error.message };
  }
});

// Print to network printer
ipcMain.handle('printer:print-network', async (event, { ip, port, data, format }) => {
  try {
    const result = await printerService.printToNetwork(ip, port, data, format);
    return result;
  } catch (error) {
    console.error('Network print error:', error);
    return { success: false, error: error.message };
  }
});

// Test printer connection
ipcMain.handle('printer:test', async (event, { type, config }) => {
  try {
    const result = await printerService.testPrinter(type, config);
    return result;
  } catch (error) {
    console.error('Printer test error:', error);
    return { success: false, error: error.message };
  }
});

// Open cash drawer
ipcMain.handle('printer:open-drawer', async (event, { type, config }) => {
  try {
    const result = await printerService.openCashDrawer(type, config);
    return result;
  } catch (error) {
    console.error('Cash drawer error:', error);
    return { success: false, error: error.message };
  }
});

// Get printer status
ipcMain.handle('printer:status', async (event, { type, config }) => {
  try {
    const result = await printerService.getPrinterStatus(type, config);
    return result;
  } catch (error) {
    console.error('Printer status error:', error);
    return { success: false, error: error.message, status: 'unknown' };
  }
});

// Check if running in Electron
ipcMain.handle('app:is-electron', () => {
  return true;
});

// Get app version
ipcMain.handle('app:version', () => {
  return app.getVersion();
});

// ============================================
// Error handling
// ============================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
