/**
 * Node.js MQTT Payment Backend for CTU-Kiosk
 * Bridges Raspberry Pi GPIO hardware events with React frontend via WebSocket
 * 
 * Requires: npm install mqtt ws
 * 
 * This integrates with:
 * - payment_gpio_mqtt.py (Raspberry Pi side: bill/coin detection)
 * - PaymentPage.js (React frontend: UI state management)
 * - paymentHardware.js (JavaScript hardware simulator/logger)
 */

const mqtt = require('mqtt');
const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const net = require('net');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// CORS middleware
const corsMiddleware = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
};

// ============ MQTT Configuration ============
const MQTT_BROKER_URL = process.env.MQTT_BROKER || 'mqtt://localhost:1883';
const MQTT_TOPICS = {
  BILL: 'ctu-kiosk/payment/bill',
  COIN: 'ctu-kiosk/payment/coin',
  DISPENSE: 'ctu-kiosk/payment/dispense'
};

// ============ Debug Pulse Logger ============
/**
 * Debug function to print pulses received from actual hardware components
 * Provides real-time terminal output of all pulse data
 */
const pulseDebugLog = [];
const MAX_DEBUG_LOG = 150;

function debugPrintPulses(source, data) {
  const timestamp = new Date().toLocaleTimeString();
  let logEntry = '';

  if (source === 'COIN') {
    logEntry = `[${timestamp}] ⚡ [REAL COIN PULSE] Type: ${source} | Pulses: ${data.pulses} | Value: ₱${data.value} | Total: ₱${data.totalCredit} | GPIO${HARDWARE_CONFIG.COIN_PIN}`;
  } else if (source === 'BILL') {
    logEntry = `[${timestamp}] ⚡ [REAL BILL PULSE] Type: ${source} | Pulses: ${data.pulses} | Amount: ₱${data.amount} | Total: ₱${data.totalCredit} | GPIO${HARDWARE_CONFIG.BILL_PIN}`;
  } else if (source === 'RAW_COIN_PULSE') {
    logEntry = `[${timestamp}] 📊 [RAW COIN PULSE] ${data.message}`;
  } else if (source === 'RAW_BILL_PULSE') {
    logEntry = `[${timestamp}] 📊 [RAW BILL PULSE] ${data.message}`;
  }

  console.log('\n' + '═'.repeat(80));
  console.log(logEntry);
  console.log('═'.repeat(80) + '\n');

  pulseDebugLog.push(logEntry);
  if (pulseDebugLog.length > MAX_DEBUG_LOG) {
    pulseDebugLog.shift();
  }
}

// ============ MQTT Configuration =============
// This mirrors the test.py and payment_gpio_mqtt.py logic
const HARDWARE_CONFIG = {
  COIN_PIN: 2,          // Actual Raspberry Pi GPIO 2 (physical pin 3)
  BILL_PIN: 22,         // Actual Raspberry Pi GPIO 22 (physical pin 15)
  COIN_GAP_TIMEOUT: 0.5, // 500ms gap = end of coin pulse burst
  BILL_DONE_TIMEOUT: 0.25, // 250ms gap = end of bill pulse burst
  PULSE_TO_VALUE: { 1: 1, 2: 5, 5: 5, 10: 10, 20: 20 },
  BILL_VALUE_PER_PULSE: 10
};

// ============ State Management ============
let paymentState = {
  coinPulseCount: 0,
  billPulseCount: 0,
  totalCredit: 0,
  lastCoinPulseTime: 0,
  lastBillPulseTime: 0,
  transactions: []
};

// ============ MQTT Client Setup ============
const mqttClient = mqtt.connect(MQTT_BROKER_URL);

console.log('🔌 [MQTT] Connecting to broker:', MQTT_BROKER_URL);

mqttClient.on('connect', () => {
  console.log('✅ [MQTT] Connected to broker');
  mqttClient.subscribe([MQTT_TOPICS.BILL, MQTT_TOPICS.COIN], (err) => {
    if (err) {
      console.error('❌ [MQTT] Subscription error:', err);
    } else {
      console.log('📡 [MQTT] Subscribed to:', Object.values(MQTT_TOPICS).slice(0, 2));
    }
  });
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    logPaymentEvent('MQTT', `Received on ${topic}:`, data);

    if (topic === MQTT_TOPICS.BILL) {
      handleBillEvent(data);
    } else if (topic === MQTT_TOPICS.COIN) {
      handleCoinEvent(data);
    }
  } catch (error) {
    console.error('❌ [MQTT] Parse error:', error);
  }
});

mqttClient.on('error', (error) => {
  console.error('❌ [MQTT] Connection error:', error);
});

mqttClient.on('reconnect', () => {
  console.log('🔄 [MQTT] Attempting to reconnect...');
});

// ============ Payment Event Handlers ============

/**
 * Handle bill insertion event from hardware
 */
function handleBillEvent(data) {
  debugPrintPulses('RAW_BILL_PULSE', { message: `Received MQTT message: ${JSON.stringify(data)}` });
  
  const now = Date.now() / 1000;
  paymentState.billPulseCount = (data.pulses || 1);
  paymentState.lastBillPulseTime = now;

  logPaymentEvent('BILL', `🔔 Pulse burst detected: ${paymentState.billPulseCount} pulses from GPIO${HARDWARE_CONFIG.BILL_PIN}`);

  // Process bill burst after timeout
  setTimeout(() => {
    const pulses = paymentState.billPulseCount;
    if (pulses > 0) {
      const added = pulses * HARDWARE_CONFIG.BILL_VALUE_PER_PULSE;
      paymentState.totalCredit += added;

      const billEvent = {
        type: 'bill',
        pulses,
        amount: added,
        totalCredit: paymentState.totalCredit,
        timestamp: new Date().toISOString(),
        gpioPin: HARDWARE_CONFIG.BILL_PIN
      };

      // Debug: Print exactly what's being broadcast
      console.log(`\n📊 [BACKEND_BILL] Received: ${pulses} pulses, amount: ₱${data.amount}`);
      console.log(`📊 [BACKEND_BILL] Calculated: ${pulses} × ₱${HARDWARE_CONFIG.BILL_VALUE_PER_PULSE} = ₱${added}`);
      console.log(`📊 [BACKEND_BILL] Broadcasting: ${JSON.stringify(billEvent)}\n`);
      
      // Debug: Print processed bill pulse
      debugPrintPulses('BILL', billEvent);
      
      logPaymentEvent('BILL', `✓ ${pulses} pulses → ₱${added} | Total: ₱${paymentState.totalCredit}`);
      broadcastToWebSocket(billEvent);
      paymentState.billPulseCount = 0;
    }
  }, HARDWARE_CONFIG.BILL_DONE_TIMEOUT * 1000 + 50);
}

/**
 * Handle coin insertion event from hardware
 */
function handleCoinEvent(data) {
  debugPrintPulses('RAW_COIN_PULSE', { message: `Received MQTT message: ${JSON.stringify(data)}` });
  
  const now = Date.now() / 1000;
  paymentState.coinPulseCount = (data.pulses || 1);
  paymentState.lastCoinPulseTime = now;

  logPaymentEvent('COIN', `🔔 Pulse burst detected: ${paymentState.coinPulseCount} pulses from GPIO${HARDWARE_CONFIG.COIN_PIN}`);

  // Process coin burst after timeout
  setTimeout(() => {
    const pulses = paymentState.coinPulseCount;
    if (pulses > 0) {
      const value = HARDWARE_CONFIG.PULSE_TO_VALUE[pulses];
      
      if (value === undefined) {
        logPaymentEvent('COIN', `❌ Unknown coin: ${pulses} pulses`, 'error');
      } else {
        paymentState.totalCredit += value;

        const coinEvent = {
          type: 'coin',
          pulses,
          value,
          totalCredit: paymentState.totalCredit,
          timestamp: new Date().toISOString(),
          gpioPin: HARDWARE_CONFIG.COIN_PIN
        };

        // Debug: Print exactly what's being broadcast
        console.log(`\n📊 [BACKEND_COIN] Received: ${pulses} pulses, value: ₱${data.value}`);
        console.log(`📊 [BACKEND_COIN] Lookup: PULSE_TO_VALUE[${pulses}] = ₱${value}`);
        console.log(`📊 [BACKEND_COIN] Broadcasting: ${JSON.stringify(coinEvent)}\n`);

        // Debug: Print processed coin pulse
        debugPrintPulses('COIN', coinEvent);
        
        logPaymentEvent('COIN', `✓ ${pulses} pulses → ₱${value} | Total: ₱${paymentState.totalCredit}`);
        broadcastToWebSocket(coinEvent);
        paymentState.coinPulseCount = 0;
      }
    }
  }, HARDWARE_CONFIG.COIN_GAP_TIMEOUT * 1000 + 50);
}

/**
 * Handle dispense command from frontend
 */
function handleDispenseCommand(amount) {
  logPaymentEvent('DISPENSE', `Change command: dispense ₱${amount}`);
  
  mqttClient.publish(
    MQTT_TOPICS.DISPENSE,
    JSON.stringify({
      dispense: true,
      amount,
      timestamp: new Date().toISOString()
    }),
    (error) => {
      if (error) {
        console.error('❌ [MQTT] Publish error:', error);
      } else {
        logPaymentEvent('DISPENSE', `✅ Command sent to hardware servo`);
      }
    }
  );
}

// ============ WebSocket Server Setup ============
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const WS_PORT = process.env.WS_PORT || 8081;

// Use CORS middleware
app.use(corsMiddleware);
app.use(express.json());

wss.on('connection', (ws) => {
  console.log(`\n🌐 [WebSocket] Client connected. Total clients: ${wss.clients.size}`);
  
  // Send initial state to client (without circular references)
  ws.send(JSON.stringify({
    type: 'init',
    state: {
      coinPulseCount: paymentState.coinPulseCount,
      billPulseCount: paymentState.billPulseCount,
      totalCredit: paymentState.totalCredit,
      lastCoinPulseTime: paymentState.lastCoinPulseTime,
      lastBillPulseTime: paymentState.lastBillPulseTime
    },
    config: HARDWARE_CONFIG
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📨 [WebSocket] Received:`, data);

      if (data.type === 'dispense') {
        handleDispenseCommand(data.amount);
      } else if (data.type === 'reset') {
        paymentState.totalCredit = 0;
        paymentState.coinPulseCount = 0;
        paymentState.billPulseCount = 0;
        logPaymentEvent('RESET', 'Payment state reset');
        broadcastToWebSocket({ type: 'reset', state: paymentState });
      } else if (data.type === 'status') {
        ws.send(JSON.stringify({ type: 'status', state: paymentState }));
      }
    } catch (error) {
      console.error('❌ [WebSocket] Parse error:', error);
    }
  });

  ws.on('close', () => {
    console.log(`🌐 [WebSocket] Client disconnected. Total clients: ${wss.clients.size}\n`);
  });

  ws.on('error', (error) => {
    console.error('❌ [WebSocket] Error:', error);
  });
});

// ============ Logging Utility ============
function logPaymentEvent(source, message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    'info': 'ℹ️',
    'warn': '⚠️',
    'error': '❌',
    'success': '✅'
  }[level] || 'ℹ️';

  console.log(`${prefix} [${timestamp}] [${source}] ${message}`);

  // Store transaction log
  paymentState.transactions.push({
    timestamp,
    source,
    message,
    level,
    state: { ...paymentState }
  });

  // Keep last 100 transactions
  if (paymentState.transactions.length > 100) {
    paymentState.transactions.shift();
  }
}

// ============ WebSocket Broadcasting ============
function broadcastToWebSocket(data) {
  console.log(`📢 [WebSocket] Broadcasting:`, data);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// ============ Express Routes ============
// Middleware already configured above with CORS and JSON parsing

app.get('/status', (req, res) => {
  res.json({
    mqtt: { connected: mqttClient.connected, broker: MQTT_BROKER_URL },
    websocket: { clients: wss.clients.size, port: WS_PORT },
    payment: paymentState
  });
});

app.post('/dispense', (req, res) => {
  const { amount } = req.body;
  if (!amount) {
    return res.status(400).json({ error: 'Amount required' });
  }
  handleDispenseCommand(amount);
  res.json({ success: true, amount, timestamp: new Date().toISOString() });
});

app.post('/reset', (req, res) => {
  paymentState.totalCredit = 0;
  paymentState.coinPulseCount = 0;
  paymentState.billPulseCount = 0;
  logPaymentEvent('REST_API', 'Payment state reset via HTTP');
  broadcastToWebSocket({ type: 'reset', state: paymentState });
  res.json({ success: true, state: paymentState });
});

app.get('/transactions', (req, res) => {
  res.json(paymentState.transactions);
});

app.get('/pulse-debug-log', (req, res) => {
  res.json({
    lastEntries: pulseDebugLog.slice(-50),
    totalEntries: pulseDebugLog.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Print ticket endpoint
 * Receives ticket data and generates a simple preset ticket for printing
 */
/**
 * ============ ESC/POS Printer Configuration ============
 * Dynamically detects connected USB thermal printers or uses fallback settings
 */
function getUsbPrinterConfig() {
  // Default USB vendor/product IDs for common thermal printers
  const commonPrinterIds = [
    { vid: 0x04b8, pid: 0x0202 }, // Epson TM series
    { vid: 0x0b01, pid: 0x006b }, // Zebra printers
    { vid: 0x0556, pid: 0x0004 }, // Asix ECL-P50
    { vid: 0x1504, pid: 0x0006 }, // Generic thermal printer
  ];

  // Try environment variable first
  const envVid = parseInt(process.env.PRINTER_USB_VID || '0', 16);
  const envPid = parseInt(process.env.PRINTER_USB_PID || '0', 16);
  
  if (envVid && envPid) {
    console.log(`🖨️ [PRINTER] Using environment USB config: VID=${envVid.toString(16)}, PID=${envPid.toString(16)}`);
    return { vid: envVid, pid: envPid };
  }

  // Return default (first common printer)
  return commonPrinterIds[0];
}

app.post('/print-ticket', async (req, res) => {
  console.log('📨 [PRINTER] Received print request:', req.body);
  
  try {
    const { age, facility, ticketNumber, originalPrice, discountPrice, hasDiscount, transactionId } = req.body;
    
    if (!transactionId || !facility) {
      console.error('❌ [PRINTER] Missing required fields:', { transactionId, facility });
      return res.status(400).json({ success: false, error: 'Missing required ticket data' });
    }

    // Call Python printer script
    const ticketData = {
      age,
      facility,
      ticketNumber,
      originalPrice,
      discountPrice,
      hasDiscount,
      transactionId
    };

    console.log('🖨️ [PRINTER] Calling Python print script...');
    
    const pythonInterpreter = path.join(__dirname, 'escpos-env', 'bin', 'python3');
    const pythonProcess = spawn(pythonInterpreter, [
      path.join(__dirname, 'print_ticket.py'),
      JSON.stringify(ticketData)
    ], {
      cwd: __dirname,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      if (data.toString().includes('error') || data.toString().includes('Error')) {
        console.error('⚠️ [PRINTER] stderr:', data.toString());
      }
    });

    pythonProcess.on('close', (code) => {
      console.log(`🔚 [PRINTER] Python process exited with code: ${code}`);
      
      if (code === 0 && stdout) {
        try {
          const result = JSON.parse(stdout);
          if (result.success) {
            console.log(`✅ [PRINTER] Ticket printed successfully. Transaction: ${transactionId}`);
            res.json({
              success: true,
              message: 'Ticket printed successfully',
              transactionId,
              timestamp: new Date().toISOString()
            });
          } else {
            console.error('❌ [PRINTER] Print failed:', result.error);
            res.status(500).json({
              success: false,
              error: result.error || 'Print failed'
            });
          }
        } catch (parseError) {
          console.error('❌ [PRINTER] Failed to parse Python output:', parseError);
          res.status(500).json({
            success: false,
            error: 'Failed to parse printer response'
          });
        }
      } else {
        const errorMsg = stderr || stdout || `Process exited with code ${code}`;
        console.error('❌ [PRINTER] Process error:', errorMsg);
        res.status(500).json({
          success: false,
          error: errorMsg
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('❌ [PRINTER] Failed to start Python process:', error);
      res.status(500).json({
        success: false,
        error: `Failed to start printer: ${error.message}`
      });
    });

  } catch (error) {
    console.error('❌ [PRINTER] Endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============ Server Startup ============
server.listen(WS_PORT, () => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 CTU-Kiosk Payment Backend Started`);
  console.log(`${'='.repeat(60)}`);
  console.log(`📡 MQTT Broker: ${MQTT_BROKER_URL}`);
  console.log(`🌐 WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`🔌 REST API: http://localhost:${WS_PORT}`);
  console.log(`${'='.repeat(60)}\n`);
});

// ============ Graceful Shutdown ============
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down gracefully...');
  
  mqttClient.end();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });

  // Force exit after 5 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown');
    process.exit(1);
  }, 5000);
});

module.exports = {
  initMqtt: () => mqttClient,
  dispenseChange: handleDispenseCommand,
  getPaymentState: () => ({ ...paymentState }),
  broadcastToWebSocket,
  wss
};

