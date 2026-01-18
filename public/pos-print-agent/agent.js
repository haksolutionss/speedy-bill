/**
 * SpeedyBill POS Local Print Agent
 * 
 * This Node.js agent runs on the local machine and:
 * 1. Polls the Supabase print queue for pending jobs
 * 2. Sends print jobs to local thermal printers via USB/Network
 * 3. Reports job completion status back to the queue
 * 
 * Installation:
 *   npm install
 *   node agent.js
 * 
 * Configuration:
 *   Set environment variables or edit config below
 */

const net = require('net');
const http = require('http');

// ============= CONFIGURATION =============
const CONFIG = {
  // Supabase Edge Function URL (replace with your project URL)
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY',
  
  // Polling interval in milliseconds
  POLL_INTERVAL: 2000,
  
  // Agent ID (unique per machine)
  AGENT_ID: process.env.AGENT_ID || `agent-${require('os').hostname()}`,
  
  // Local HTTP server port (for health checks and direct printing)
  LOCAL_PORT: 8765,
  
  // Printer configurations
  PRINTERS: {
    counter: { type: 'network', ip: '192.168.1.100', port: 9100, width: 48 },
    kitchen: { type: 'network', ip: '192.168.1.101', port: 9100, width: 48 },
    bar: { type: 'network', ip: '192.168.1.102', port: 9100, width: 48 },
  }
};

// ============= ESC/POS COMMANDS =============
const ESC = 0x1B;
const GS = 0x1D;

const ESCPOS = {
  INIT: Buffer.from([ESC, 0x40]),
  CUT: Buffer.from([GS, 0x56, 0x00]),
  FEED: (lines) => Buffer.from([ESC, 0x64, lines]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: Buffer.from([GS, 0x21, 0x10]),
  DOUBLE_WIDTH: Buffer.from([GS, 0x21, 0x20]),
  DOUBLE_SIZE: Buffer.from([GS, 0x21, 0x30]),
  NORMAL_SIZE: Buffer.from([GS, 0x21, 0x00]),
  UNDERLINE_ON: Buffer.from([ESC, 0x2D, 0x01]),
  UNDERLINE_OFF: Buffer.from([ESC, 0x2D, 0x00]),
  OPEN_DRAWER: Buffer.from([ESC, 0x70, 0x00, 0x19, 0xFA]),
};

// ============= PRINT COMMANDS BUILDER =============
function buildKOTCommands(data, width = 48) {
  const buffers = [ESCPOS.INIT];
  
  // Header
  buffers.push(ESCPOS.ALIGN_CENTER, ESCPOS.DOUBLE_SIZE);
  buffers.push(Buffer.from('** KOT **\n'));
  buffers.push(ESCPOS.NORMAL_SIZE);
  
  // KOT Number & Table
  buffers.push(Buffer.from(`KOT: ${data.kotNumber || 'N/A'}\n`));
  if (data.tableNumber) {
    buffers.push(ESCPOS.DOUBLE_HEIGHT);
    buffers.push(Buffer.from(`TABLE: ${data.tableNumber}\n`));
    buffers.push(ESCPOS.NORMAL_SIZE);
  }
  if (data.tokenNumber) {
    buffers.push(Buffer.from(`Token: ${data.tokenNumber}\n`));
  }
  
  buffers.push(Buffer.from(`${new Date().toLocaleString()}\n`));
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  
  // Items
  buffers.push(ESCPOS.ALIGN_LEFT, ESCPOS.BOLD_ON);
  for (const item of data.items || []) {
    const qty = String(item.quantity).padStart(3);
    const name = item.name.substring(0, width - 10);
    buffers.push(Buffer.from(`${qty} x ${name}\n`));
    if (item.portion && item.portion !== 'Regular') {
      buffers.push(Buffer.from(`     [${item.portion}]\n`));
    }
    if (item.notes) {
      buffers.push(Buffer.from(`     >> ${item.notes}\n`));
    }
  }
  buffers.push(ESCPOS.BOLD_OFF);
  
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  buffers.push(ESCPOS.FEED(3), ESCPOS.CUT);
  
  return Buffer.concat(buffers);
}

function buildBillCommands(data, width = 48) {
  const buffers = [ESCPOS.INIT];
  
  // Business Header
  buffers.push(ESCPOS.ALIGN_CENTER, ESCPOS.DOUBLE_SIZE);
  buffers.push(Buffer.from(`${data.businessName || 'Restaurant'}\n`));
  buffers.push(ESCPOS.NORMAL_SIZE);
  
  if (data.businessAddress) {
    buffers.push(Buffer.from(`${data.businessAddress}\n`));
  }
  if (data.businessPhone) {
    buffers.push(Buffer.from(`Tel: ${data.businessPhone}\n`));
  }
  if (data.gstNumber) {
    buffers.push(Buffer.from(`GSTIN: ${data.gstNumber}\n`));
  }
  
  buffers.push(Buffer.from('='.repeat(width) + '\n'));
  
  // Bill Info
  buffers.push(ESCPOS.ALIGN_LEFT);
  buffers.push(Buffer.from(`Bill: ${data.billNumber}\n`));
  buffers.push(Buffer.from(`Date: ${new Date().toLocaleString()}\n`));
  if (data.tableNumber) {
    buffers.push(Buffer.from(`Table: ${data.tableNumber}\n`));
  }
  
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  
  // Items Header
  const itemHeader = 'Item'.padEnd(width - 20) + 'Qty'.padStart(4) + 'Price'.padStart(8) + 'Total'.padStart(8);
  buffers.push(Buffer.from(itemHeader + '\n'));
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  
  // Items
  for (const item of data.items || []) {
    const name = item.name.substring(0, width - 20);
    const qty = String(item.quantity).padStart(4);
    const price = item.unitPrice.toFixed(2).padStart(8);
    const total = (item.quantity * item.unitPrice).toFixed(2).padStart(8);
    buffers.push(Buffer.from(`${name.padEnd(width - 20)}${qty}${price}${total}\n`));
  }
  
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  
  // Totals
  buffers.push(ESCPOS.ALIGN_RIGHT);
  buffers.push(Buffer.from(`Subtotal: ${data.subTotal?.toFixed(2) || '0.00'}\n`));
  if (data.cgstAmount) {
    buffers.push(Buffer.from(`CGST: ${data.cgstAmount.toFixed(2)}\n`));
  }
  if (data.sgstAmount) {
    buffers.push(Buffer.from(`SGST: ${data.sgstAmount.toFixed(2)}\n`));
  }
  if (data.discountAmount) {
    buffers.push(Buffer.from(`Discount: -${data.discountAmount.toFixed(2)}\n`));
  }
  
  buffers.push(Buffer.from('='.repeat(width) + '\n'));
  buffers.push(ESCPOS.BOLD_ON, ESCPOS.DOUBLE_HEIGHT);
  buffers.push(Buffer.from(`TOTAL: ${data.currency || '₹'}${data.finalAmount?.toFixed(2) || '0.00'}\n`));
  buffers.push(ESCPOS.NORMAL_SIZE, ESCPOS.BOLD_OFF);
  
  if (data.paymentMethod) {
    buffers.push(Buffer.from(`Paid by: ${data.paymentMethod}\n`));
  }
  
  buffers.push(Buffer.from('='.repeat(width) + '\n'));
  
  // Footer
  buffers.push(ESCPOS.ALIGN_CENTER);
  buffers.push(Buffer.from('Thank you for your visit!\n'));
  buffers.push(ESCPOS.FEED(3), ESCPOS.CUT);
  
  return Buffer.concat(buffers);
}

function buildTestCommands(width = 48) {
  const buffers = [ESCPOS.INIT];
  
  buffers.push(ESCPOS.ALIGN_CENTER, ESCPOS.DOUBLE_SIZE);
  buffers.push(Buffer.from('PRINTER TEST\n'));
  buffers.push(ESCPOS.NORMAL_SIZE);
  buffers.push(Buffer.from(`${new Date().toLocaleString()}\n`));
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  buffers.push(Buffer.from('If you can read this,\n'));
  buffers.push(Buffer.from('your printer is working!\n'));
  buffers.push(Buffer.from('-'.repeat(width) + '\n'));
  buffers.push(ESCPOS.FEED(3), ESCPOS.CUT);
  
  return Buffer.concat(buffers);
}

// ============= NETWORK PRINTER =============
function printToNetworkPrinter(ip, port, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    
    socket.connect(port, ip, () => {
      console.log(`Connected to printer at ${ip}:${port}`);
      socket.write(data, () => {
        socket.end();
        resolve(true);
      });
    });
    
    socket.on('error', (err) => {
      console.error(`Printer error (${ip}:${port}):`, err.message);
      reject(err);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// ============= PRINT JOB PROCESSOR =============
async function processJob(job) {
  const printerConfig = CONFIG.PRINTERS[job.printer_role] || CONFIG.PRINTERS.counter;
  
  let printData;
  switch (job.job_type) {
    case 'kot':
      printData = buildKOTCommands(job.payload, printerConfig.width);
      break;
    case 'bill':
      printData = buildBillCommands(job.payload, printerConfig.width);
      break;
    case 'test':
      printData = buildTestCommands(printerConfig.width);
      break;
    default:
      throw new Error(`Unknown job type: ${job.job_type}`);
  }
  
  if (printerConfig.type === 'network') {
    await printToNetworkPrinter(printerConfig.ip, printerConfig.port, printData);
  } else {
    throw new Error(`Unsupported printer type: ${printerConfig.type}`);
  }
  
  console.log(`✓ Printed ${job.job_type} job ${job.id}`);
}

// ============= API CLIENT =============
async function fetchPendingJobs() {
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/print-queue/pending?agent_id=${CONFIG.AGENT_ID}&limit=10`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.jobs || [];
}

async function reportJobComplete(jobId, success, errorMessage = null) {
  const url = `${CONFIG.SUPABASE_URL}/functions/v1/print-queue/complete`;
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id: jobId,
      success,
      error_message: errorMessage,
    }),
  });
}

// ============= MAIN LOOP =============
let isProcessing = false;

async function pollAndProcess() {
  if (isProcessing) return;
  isProcessing = true;
  
  try {
    const jobs = await fetchPendingJobs();
    
    for (const job of jobs) {
      try {
        await processJob(job);
        await reportJobComplete(job.id, true);
      } catch (error) {
        console.error(`Failed to process job ${job.id}:`, error.message);
        await reportJobComplete(job.id, false, error.message);
      }
    }
  } catch (error) {
    // Silent fail on polling errors (network issues, etc.)
    if (error.message.includes('fetch')) {
      // Connection error - server might be unreachable
    } else {
      console.error('Polling error:', error.message);
    }
  } finally {
    isProcessing = false;
  }
}

// ============= LOCAL HTTP SERVER =============
// Provides health check and direct print endpoint for legacy support
function startLocalServer() {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Health check
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        agent_id: CONFIG.AGENT_ID,
        printers: Object.keys(CONFIG.PRINTERS),
      }));
      return;
    }
    
    // Direct print (legacy/backup)
    if (req.url === '/print' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const printerConfig = CONFIG.PRINTERS[data.printer_role || 'counter'];
          
          let printData;
          if (data.job_type === 'kot') {
            printData = buildKOTCommands(data.payload, printerConfig.width);
          } else if (data.job_type === 'bill') {
            printData = buildBillCommands(data.payload, printerConfig.width);
          } else {
            printData = buildTestCommands(printerConfig.width);
          }
          
          await printToNetworkPrinter(
            data.printerIp || printerConfig.ip,
            data.printerPort || printerConfig.port,
            printData
          );
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
      return;
    }
    
    res.writeHead(404);
    res.end('Not found');
  });
  
  server.listen(CONFIG.LOCAL_PORT, () => {
    console.log(`Local print server running on http://localhost:${CONFIG.LOCAL_PORT}`);
  });
}

// ============= STARTUP =============
console.log('╔════════════════════════════════════════╗');
console.log('║   SpeedyBill POS Local Print Agent    ║');
console.log('╚════════════════════════════════════════╝');
console.log(`Agent ID: ${CONFIG.AGENT_ID}`);
console.log(`Polling interval: ${CONFIG.POLL_INTERVAL}ms`);
console.log(`Configured printers:`, Object.keys(CONFIG.PRINTERS).join(', '));
console.log('');

// Start local HTTP server
startLocalServer();

// Start polling loop
setInterval(pollAndProcess, CONFIG.POLL_INTERVAL);
console.log('Polling for print jobs...');

// Initial poll
pollAndProcess();
