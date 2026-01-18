# SpeedyBill POS - Electron Desktop Application

## Overview

This guide explains how to build the SpeedyBill POS as a Windows desktop application (.exe) with full thermal printer support.

## Why Electron?

Browser-based POS systems have limitations:
- **Mixed Content Errors**: HTTPS pages cannot access local HTTP printers
- **WebUSB Restrictions**: `SecurityError: Access denied` when accessing USB devices
- **No Silent Printing**: Browser always shows print dialogs
- **Session-based Permissions**: Users must re-grant permissions

Electron solves all these issues by running Node.js locally, providing direct hardware access.

## Architecture

```
SpeedyBill POS (Electron)
├── Renderer Process (React)
│   ├── UI Components
│   ├── Supabase Integration
│   └── Authentication
│
├── Main Process (Node.js)
│   ├── USB Printer Access (via 'usb' package)
│   ├── Network Printer Access (TCP sockets)
│   └── ESC/POS Command Generation
│
└── Preload Script
    └── Secure IPC Bridge
```

## Prerequisites

1. **Node.js 18+** - Download from https://nodejs.org
2. **Windows Build Tools** (for USB support):
   ```bash
   npm install --global windows-build-tools
   ```
3. **Git** - Download from https://git-scm.com

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone <your-repo-url>
cd speedybill-pos

# Install web app dependencies
npm install

# Install Electron and build dependencies
npm install --save-dev electron electron-builder usb
```

### 2. Update package.json

Add these scripts to your `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:8080 && electron . --dev\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:win": "npm run build && electron-builder --win",
    "electron:build:portable": "npm run build && electron-builder --win portable"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "usb": "^2.11.0",
    "concurrently": "^8.2.2",
    "wait-on": "^7.2.0"
  }
}
```

### 3. Build for Windows

```bash
# Build the React app and create Windows installer
npm run electron:build:win
```
or
ELECTRON=true npm run electron:build:win


This creates:
- `release/SpeedyBill POS-1.0.0-x64.exe` - Installer
- `release/SpeedyBill POS-Portable-1.0.0.exe` - Portable version

## Development Mode

Run in development with hot reload:

```bash
npm run electron:dev
```

This starts:
1. Vite dev server on http://localhost:8080
2. Electron app loading from the dev server
3. DevTools for debugging

## Printer Configuration

### USB Printers

1. Connect your USB thermal printer
2. Open SpeedyBill POS → Settings → Printers
3. Click "Scan USB Printers"
4. Select your printer from the list
5. Configure paper size (58mm, 76mm, 80mm)
6. Test print to verify

### Network Printers

1. Ensure printer is on the same network
2. Find the printer's IP address (usually on printer's test page)
3. Open Settings → Printers
4. Add printer manually with IP and port (default: 9100)
5. Test print to verify

## Troubleshooting

### USB Printer Not Found

1. Install printer driver from manufacturer
2. On Windows, install Zadig to set WinUSB driver:
   - Download from https://zadig.akeo.ie
   - Select your printer
   - Install WinUSB driver

### Network Printer Not Connecting

1. Verify printer IP with `ping <printer-ip>`
2. Check port 9100 is open: `telnet <printer-ip> 9100`
3. Disable Windows Firewall temporarily to test
4. Ensure printer is not in sleep mode

### Build Errors

```bash
# Clear npm cache
npm cache clean --force

# Rebuild native modules
npm rebuild

# For USB module issues on Windows
npm install --global --production windows-build-tools
npm rebuild usb --update-binary
```

## Distribution

### Creating an Installer

The NSIS installer:
- Allows custom install location
- Creates Start Menu shortcut
- Creates Desktop shortcut
- Adds uninstaller

### Signing (Optional but Recommended)

For production distribution, sign your application:

1. Obtain a code signing certificate
2. Add to `electron-builder.json`:
   ```json
   {
     "win": {
       "certificateFile": "path/to/cert.pfx",
       "certificatePassword": "your-password"
     }
   }
   ```

## Security Notes

- Electron app still uses Supabase for authentication
- Data is stored securely in Supabase
- Printer communication stays local (no cloud printing)
- The app requires network access only for Supabase

## Support

For issues:
1. Check console for errors (F12 → Console)
2. Try the portable version if installer fails
3. Ensure antivirus isn't blocking the app
4. Run as Administrator if needed
