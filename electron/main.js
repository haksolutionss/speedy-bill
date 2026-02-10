const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');

// Keep a global reference
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
    show: true,
    backgroundColor: '#0a0a0b',
  });

  // Initialize printer service
  try {
    const PrinterService = require('./printer-service');
    printerService = new PrinterService();
    console.log('✓ Printer service initialized');
  } catch (error) {
    console.error('✗ Printer service failed:', error.message);
    printerService = createMockPrinterService();
  }

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5172');
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load:', err);
      const fallbackPath = path.join(app.getAppPath(), 'dist', 'index.html');
      mainWindow.loadFile(fallbackPath).catch(err2 => {
        mainWindow.loadURL(`data:text/html,<h1>Failed to load</h1><p>${err.message}</p>`);
      });
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Load failed:', errorCode, errorDescription);
    if (isDev) {
      setTimeout(() => mainWindow.loadURL('http://localhost:5172'), 2000);
    }
  });

  // Menu
  const menu = Menu.buildFromTemplate([
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
        { label: 'Fullscreen', accelerator: 'F11', click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { type: 'separator' },
        { label: 'Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About', click: () => showAboutDialog() }
      ]
    }
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createMockPrinterService() {
  return {
    listPrinters: async () => ({ success: true, printers: [] }),
    discoverPrinters: async () => ({ success: true, printer: null, printers: [] }),
    printToUSB: async () => ({ success: false, error: 'Printer service not initialized' }),
    testPrinter: async () => ({ success: false, error: 'Printer service not initialized' }),
    openCashDrawer: async () => ({ success: false, error: 'Printer service not initialized' }),
    getPrinterStatus: async () => ({ success: false, status: 'unavailable' }),
  };
}

function showAboutDialog() {
  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: 'About SpeedyBill POS',
    message: 'SpeedyBill POS',
    detail: `Version: ${app.getVersion()}\nPrinter: POSYTUDE YHD-8330 (USB)\n\nOptimized for thermal receipt printing.`,
    buttons: ['OK']
  });
}

// Auto-discover POSYTUDE printer on startup
async function discoverPrinterOnStartup() {
  if (!mainWindow || !printerService) return;

  console.log('Discovering POSYTUDE printer...');

  try {
    const result = await printerService.discoverPrinters();

    if (result.printer) {
      console.log('✓ POSYTUDE printer found:', result.printer.name);
    } else {
      console.log('✗ No POSYTUDE printer found');
    }

    // Send to renderer
    mainWindow.webContents.send('printer:discovered', result);

    return result;
  } catch (error) {
    console.error('Discovery error:', error);
    return { success: false, printer: null, printers: [] };
  }
}

// ============================================
// HTML Bill Printing — Hidden BrowserWindow
// ============================================

/**
 * Print an HTML bill string using a hidden BrowserWindow.
 * Silent print, zero margins, printBackground enabled.
 * The paperWidth (e.g. '80mm') controls page size.
 */
async function printHtmlBill(htmlContent, paperWidthMm) {
  return new Promise((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      width: 576,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    printWindow.webContents.on('did-finish-load', () => {
      // Small delay to ensure CSS is fully rendered
      setTimeout(() => {
        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: {
              width: parsePaperWidth(paperWidthMm),
              height: 300000, // auto-height (large enough for any receipt)
            },
          },
          (success, failureReason) => {
            printWindow.close();
            if (success) {
              resolve({ success: true });
            } else {
              console.error('[HTML Print] Failed:', failureReason);
              resolve({ success: false, error: failureReason || 'HTML print failed' });
            }
          }
        );
      }, 200);
    });

    printWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc) => {
      console.error('[HTML Print] Load failed:', errorDesc);
      printWindow.close();
      resolve({ success: false, error: `Load failed: ${errorDesc}` });
    });

    // Safety timeout — don't hang forever
    setTimeout(() => {
      if (!printWindow.isDestroyed()) {
        printWindow.close();
        resolve({ success: false, error: 'Print timed out' });
      }
    }, 15000);
  });
}

/**
 * Convert paper width string to microns for Electron's pageSize
 * Electron expects width in microns (1mm = 1000 microns)
 */
function parsePaperWidth(paperWidthMm) {
  const map = {
    '58mm': 58000,
    '76mm': 76000,
    '80mm': 80000,
  };
  return map[paperWidthMm] || 80000;
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Auto-discover after window loads
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(discoverPrinterOnStartup, 1500);
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ============================================
// IPC Handlers
// ============================================

// Discover printer
ipcMain.handle('printer:discover', async () => {
  return discoverPrinterOnStartup();
});

// List printers
ipcMain.handle('printer:list', async () => {
  try {
    return await printerService.listPrinters();
  } catch (error) {
    return { success: false, error: error.message, printers: [] };
  }
});

// Print to USB (raw ESC/POS bytes — used for KOT + text fallback)
ipcMain.handle('printer:print-usb', async (event, { vendorId, productId, data }) => {
  try {
    return await printerService.printToUSB(vendorId, productId, data);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Print HTML bill via hidden BrowserWindow (PRIMARY bill print path)
ipcMain.handle('printer:print-html', async (event, { htmlContent, paperWidth }) => {
  try {
    console.log(`[HTML Print] Printing bill (${paperWidth})…`);
    const result = await printHtmlBill(htmlContent, paperWidth);
    if (result.success) {
      console.log('[HTML Print] ✓ Bill printed successfully');
    }
    return result;
  } catch (error) {
    console.error('[HTML Print] ✗ Error:', error.message);
    return { success: false, error: error.message };
  }
});

// Test printer
ipcMain.handle('printer:test', async (event, { vendorId, productId }) => {
  try {
    return await printerService.testPrinter(vendorId, productId);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open cash drawer
ipcMain.handle('printer:open-drawer', async (event, { vendorId, productId }) => {
  try {
    return await printerService.openCashDrawer(vendorId, productId);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get printer status
ipcMain.handle('printer:status', async (event, { vendorId, productId }) => {
  try {
    return await printerService.getPrinterStatus(vendorId, productId);
  } catch (error) {
    return { success: false, status: 'error', error: error.message };
  }
});

// App version
ipcMain.handle('app:version', () => app.getVersion());

// ============================================
// Error handling
// ============================================

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
