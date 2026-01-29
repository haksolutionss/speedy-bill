# SpeedyBill POS - Electron Desktop Application

This guide covers building and distributing the SpeedyBill POS as a Windows desktop application.

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm or yarn
- Windows 10/11 for building Windows executables

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Install project dependencies
npm install

# Install Electron and build tools (run in project root)
npm install --save-dev electron electron-builder concurrently wait-on
```

### 2. Update package.json

Add these entries to your `package.json`:

```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5172 && electron .\"",
    "electron:build": "npm run build && electron-builder --win",
    "electron:build:portable": "npm run build && electron-builder --win portable"
  }
}
```

> **Note:** The `ELECTRON=true` environment variable is no longer needed as the app now uses relative paths and HashRouter by default for Electron compatibility.

### 3. Development Mode

Run the app in development mode:

```bash
# Start both Vite dev server and Electron
npm run electron:dev
```

### 4. Building for Production

```bash
# Build React app + Windows installer
npm run electron:build

# Build portable .exe (no installation required)
npm run electron:build:portable
```

Output files will be in the `release/` directory.

## Build Output

After running `npm run electron:build`, you'll find:

- `release/SpeedyBill POS-Setup-1.0.0.exe` - Windows installer
- `release/SpeedyBill POS-Portable-1.0.0.exe` - Portable executable
- `release/win-unpacked/` - Unpacked application directory (for testing)

## Important Notes for Building

### Routing Fix (HashRouter)
The app automatically uses `HashRouter` when running in Electron. This is required because:
- Electron uses `file://` protocol in production
- `BrowserRouter` requires a server to handle routes
- `HashRouter` works with static files and `file://` protocol

### Relative Paths
All asset paths use `./` (relative) instead of `/` (absolute). This ensures assets load correctly from the packaged app.

## Printer Configuration

### Supported Printer Types

1. **USB Thermal Printers** - Direct USB connection
2. **Network/LAN Printers** - IP-based connection (192.168.x.x:9100)
3. **WiFi Printers** - Same as network printers

### Setting Up Printers

1. Open the app and go to **Settings → Printers**
2. Click **Scan USB Printers** to detect connected USB printers
3. Or click **Add Network Printer** to add IP-based printers
4. Configure printer roles:
   - **Counter** - For customer receipts/bills
   - **Kitchen** - For KOT (Kitchen Order Tickets)
   - **Bar** - For bar orders

### Printer Roles

| Role | Purpose | Typical Location |
|------|---------|------------------|
| Counter | Print bills/receipts, open cash drawer | Billing counter |
| Kitchen | Print KOT with item details | Kitchen |
| Bar | Print drink orders | Bar counter |

## Printing Behavior

### Electron Desktop App
- **Silent printing** - No dialog boxes
- **Auto-print** - Receipts print immediately on F1/F2
- **Direct hardware access** - USB and network printers
- **Cash drawer support** - Opens on cash payments

### Web Browser (Fallback)
- Shows browser print dialog
- User must click Print button
- Limited printer control

## Troubleshooting

### App Won't Start

1. Check if `dist/index.html` exists (run `npm run build` first)
2. Ensure no other instance is running
3. Check Windows Defender/antivirus isn't blocking
4. Right-click and "Run as Administrator"

### Printer Not Detected

**USB Printers:**
- Ensure printer is powered on and connected
- Try a different USB port
- Install printer manufacturer's USB drivers
- On Windows, you may need Zadig for WinUSB driver

**Network Printers:**
- Verify printer IP address (usually 192.168.x.x)
- Default port is 9100
- Ensure printer and PC are on same network
- Test with: `ping <printer-ip>`

### Print Fails

1. Test with the "Test Print" button in Settings
2. Check printer paper and status lights
3. For network printers, try `telnet <printer-ip> 9100`
4. Restart the printer and app

### Build Errors

```bash
# Clear cache and rebuild
npm cache clean --force
rmdir /s /q node_modules
del /s /q release
npm install

# Rebuild the app
npm run build
electron-builder --win
```

### "Cannot find path for dependency" Error

If you see this error during build:
```
cannot find path for dependency  name=undefined reference=undefined
```

This is usually caused by the `usb` native module. The app handles this gracefully:
- Network printing works without the USB module
- USB printing requires the native module to be properly compiled

Try these fixes:
```bash
# Rebuild native modules
npm rebuild usb

# Or if USB isn't needed, you can proceed - network printing will work
```

## Distribution

### Sharing the App

1. **Installer (.exe)**: Share `SpeedyBill POS-Setup-1.0.0.exe`
   - Users double-click to install
   - Creates Start Menu and Desktop shortcuts
   - Can be uninstalled via Windows Settings

2. **Portable (.exe)**: Share `SpeedyBill POS-Portable-1.0.0.exe`
   - No installation required
   - Runs directly from any folder
   - Good for USB drives or testing

### First-Time Setup for Users

1. Install/run the application
2. On first launch, complete the onboarding wizard
3. Configure printers in Settings
4. Log in with credentials
5. Start billing!

## Architecture

```
SpeedyBill POS (Electron)
├── Main Process (Node.js)
│   ├── Window Management
│   ├── Printer Service (USB + Network)
│   └── IPC Handlers
│
├── Renderer Process (React)
│   ├── UI Components
│   ├── State Management (Zustand)
│   └── Supabase Integration
│
└── Preload Script
    └── Secure Bridge (contextBridge)
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F1 | Print KOT directly (silent) |
| F2 | Print Bill & Settle (default payment) |
| F11 | Toggle fullscreen |
| F12 | Open Developer Tools |

## Security Notes

- The app uses `contextIsolation: true` for security
- Node.js APIs are not directly exposed to the renderer
- All printer operations go through secure IPC channels
- Supabase handles authentication and data security

## Support

For issues or feature requests, contact your system administrator.
