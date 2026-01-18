# SpeedyBill POS Local Print Agent

A Node.js service that runs locally on your POS terminal/computer and handles thermal printer communication.

## Why This Agent?

Web browsers cannot directly communicate with local USB or network printers due to security restrictions:
- **HTTPS Mixed Content**: HTTPS pages can't make HTTP requests to local IPs
- **WebUSB Security**: Requires explicit user permission on every action
- **Raw TCP Sockets**: Browsers can't open raw TCP connections

This agent solves these problems by:
1. Running locally on your computer
2. Polling the cloud print queue for jobs
3. Sending ESC/POS commands directly to thermal printers

## Installation

### Prerequisites
- Node.js 18 or higher
- Network thermal printer(s) connected to your local network

### Setup

1. **Download the agent files** to your POS computer

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your printers** by editing `agent.js`:
   ```javascript
   PRINTERS: {
     counter: { type: 'network', ip: '192.168.1.100', port: 9100, width: 48 },
     kitchen: { type: 'network', ip: '192.168.1.101', port: 9100, width: 48 },
     bar: { type: 'network', ip: '192.168.1.102', port: 9100, width: 48 },
   }
   ```

4. **Set your Supabase credentials:**
   ```bash
   export SUPABASE_URL="https://your-project.supabase.co"
   export SUPABASE_ANON_KEY="your-anon-key"
   ```

5. **Run the agent:**
   ```bash
   npm start
   ```

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `SUPABASE_URL` | Your Supabase project URL | Required |
| `SUPABASE_ANON_KEY` | Your Supabase anon key | Required |
| `AGENT_ID` | Unique identifier for this agent | `agent-{hostname}` |
| `POLL_INTERVAL` | How often to check for jobs (ms) | 2000 |
| `LOCAL_PORT` | Local HTTP server port | 8765 |

## Printer Configuration

### Network Printers (Recommended)
Most thermal POS printers support raw TCP printing on port 9100.

```javascript
PRINTERS: {
  counter: { 
    type: 'network', 
    ip: '192.168.1.100',  // Printer's IP address
    port: 9100,            // Usually 9100 for thermal printers
    width: 48              // Characters per line (48 for 80mm, 32 for 58mm)
  },
}
```

### Paper Width Settings
- **80mm paper**: width = 48 characters
- **76mm paper**: width = 42 characters  
- **58mm paper**: width = 32 characters

## Running as a Service

### Windows
Use [node-windows](https://www.npmjs.com/package/node-windows) to install as a Windows service.

### Linux/macOS
Create a systemd service or use PM2:
```bash
npm install -g pm2
pm2 start agent.js --name pos-print-agent
pm2 save
pm2 startup
```

## API Endpoints

The agent also runs a local HTTP server for direct communication:

### Health Check
```
GET http://localhost:8765/health
```
Returns agent status and configured printers.

### Direct Print (Legacy)
```
POST http://localhost:8765/print
Content-Type: application/json

{
  "job_type": "bill",
  "printer_role": "counter",
  "payload": { ... bill data ... }
}
```

## Troubleshooting

### Printer Not Responding
1. Verify printer IP address is correct
2. Ensure printer is on the same network
3. Check printer port (default 9100)
4. Try pinging the printer: `ping 192.168.1.100`

### Connection Timeouts
- Increase timeout in agent.js (default 5000ms)
- Check firewall settings

### Wrong Print Output
- Verify paper width setting matches your printer
- Check printer supports ESC/POS commands

## Supported Printers

Any ESC/POS compatible thermal printer:
- Epson TM series
- Star Micronics
- SNBC
- Gprinter
- Xprinter
- Generic 80mm/58mm thermal printers

## License

MIT - Use freely in your POS setup
