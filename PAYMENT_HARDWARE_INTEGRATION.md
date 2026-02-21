## Payment Hardware Integration - Test.py to JavaScript

This document explains how the Python `test.py` hardware simulation logic has been converted to JavaScript and integrated across the codebase.

---

## 📋 Overview

The original `test.py` script simulates coin and bill acceptor hardware with pulse detection and state management. This logic has been:

1. **Converted to JavaScript** as `paymentHardware.js` - Hardware simulator with same pulse logic
2. **Integrated into PaymentPage.js** - React component with real-time logging
3. **Enhanced in mqtt_payment_backend.js** - Node.js backend with MQTT + WebSocket + REST API

---

## 🔄 Data Flow

```
Raspberry Pi Hardware (physical)
         ↓ (via GPIO pins)
test.py (Python GPIO script)
         ↓ (via MQTT)
mqtt_payment_backend.js (Node.js server)
         ↓ (via WebSocket)
Browser (React Frontend)
         ↓ (renders)
PaymentPage.js + paymentHardware.js
```

---

## 📁 Files Overview

### 1. `src/utils/paymentHardware.js` (NEW)
**Purpose:** JavaScript port of test.py hardware simulation

**Key Features:**
- Pulse counting for coins and bills
- Debouncing logic (same 50ms threshold as Python)
- Gap timeout detection (500ms coins, 250ms bills)
- Pulse-to-value mapping
- Hardware simulation methods
- Event callbacks
- Console logging with emojis

**Main Class: `PaymentHardware`**

```javascript
// Public Methods
initialize(callbacks)          // Setup with callbacks
startMonitoring()              // Begin pulse detection loop
stopMonitoring()               // End monitoring
coinPulseCallback()            // Handle coin pulse
billPulseCallback()            // Handle bill pulse
simulateCoinInsertion(count)   // Simulate coin for testing
simulateBillInsertion(count)   // Simulate bill for testing
getCredit()                    // Get current session credit
getTotalCredit()               // Get lifetime credit
resetCredit()                  // Reset for new transaction
dispenseChange(amount)         // Trigger change dispenser
getStatus()                    // Get full hardware status
```

**Callbacks Available:**
```javascript
{
  onCoinDetected: (data) => {},      // When coin burst completes
  onBillDetected: (data) => {},      // When bill burst completes
  onPaymentUpdate: (data) => {}      // Real-time update
}
```

---

### 2. `src/components/PaymentPage.js` (UPDATED)
**Purpose:** React component with payment UI + hardware integration

**New Features:**
- ✅ Hardware initialization on mount
- ✅ Real-time payment event logging
- ✅ Automatic credit tracking
- ✅ Hardware status display
- ✅ Simulation button integration
- ✅ Change dispense trigger
- ✅ Payment state logging

**New State Variables:**
```javascript
const [hardwareStatus, setHardwareStatus] = useState(null);
const [logs, setLogs] = useState([]);
```

**New Functions:**
```javascript
addLog(message)      // Add timestamped log entry
insertMoney()        // Simulates both UI button & hardware pulse
processPayment()     // Handles payment + change dispense
```

**Hardware Event Callbacks:**
- `onCoinDetected`: Updates inserted amount + logs
- `onBillDetected`: Updates inserted amount + logs
- `onPaymentUpdate`: Updates status display

**New UI Elements:**
- Hardware Event Log display with 20-entry scroll history
- Real-time coin/bill detection feedback
- Timestamps for all events

---

### 3. `mqtt_payment_backend.js` (COMPLETELY REWRITTEN)
**Purpose:** Node.js backend bridging hardware → frontend

**Architecture:**

```
Physical Hardware
    ↓ (GPIO)
payment_gpio_mqtt.py (Raspberry Pi)
    ↓ (MQTT publish)
mqtt_payment_backend.js
    ├─ MQTT Client (listen for bill/coin)
    ├─ WebSocket Server (broadcast to frontend)
    ├─ Express REST API (HTTP endpoints)
    └─ State Management (credit tracking)
```

**Configuration:**
```javascript
MQTT_BROKER_URL = 'mqtt://localhost:1883'
WS_PORT = 8081
MQTT_TOPICS = {
  BILL: 'ctu-kiosk/payment/bill',
  COIN: 'ctu-kiosk/payment/coin',
  DISPENSE: 'ctu-kiosk/payment/dispense'
}
```

**MQTT Integration:**
- Subscribe to bill/coin topics
- Process burst events with timeouts
- Publish dispense commands
- Automatic reconnection

**WebSocket Features:**
- Send initial state on client connect
- Broadcast all payment events
- Receive dispense/reset commands from frontend
- Auto-maintain client list

**REST API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/status` | GET | Get full system status |
| `/dispense` | POST | Trigger change dispense |
| `/reset` | POST | Reset payment state |
| `/transactions` | GET | View transaction history |

**Example Usage:**
```bash
# Check system status
curl http://localhost:8081/status

# Dispense change
curl -X POST http://localhost:8081/dispense -H "Content-Type: application/json" -d '{"amount": 50}'

# Reset payment
curl -X POST http://localhost:8081/reset
```

**Response Format:**
```json
{
  "mqtt": { "connected": true, "broker": "mqtt://localhost:1883" },
  "websocket": { "clients": 2, "port": 8081 },
  "payment": {
    "coinPulseCount": 0,
    "billPulseCount": 0,
    "totalCredit": 150,
    "transactions": [...]
  }
}
```

**Logging Features:**
- Prefixed console output with emojis
- ISO timestamp for all events
- Transaction history (last 100 stored)
- Source tracking (MQTT, WebSocket, REST API, etc.)

---

## 🔍 Comparison: Python vs JavaScript

### Pulse Detection Logic

**Python (test.py):**
```python
def coin_pulse_callback(channel):
    global coin_pulse_count, coin_last_pulse_time
    now = time.time()
    if (now - coin_last_pulse_time) > (COIN_DEBOUNCE_MS / 1000.0):
        coin_pulse_count += 1
        coin_last_pulse_time = now
        print(f"[COIN] Pulse! count = {coin_pulse_count}")
```

**JavaScript (paymentHardware.js):**
```javascript
coinPulseCallback() {
  const now = Date.now() / 1000; // Convert to seconds
  if (now - this.coinLastPulseTime > this.COIN_DEBOUNCE_MS / 1000) {
    this.coinPulseCount += 1;
    this.coinLastPulseTime = now;
    console.log(`[COIN] Pulse! count = ${this.coinPulseCount}`);
  }
}
```

### Burst Processing

**Python (test.py):**
```python
if coin_pulse_count > 0 and (now - coin_last_pulse_time) > COIN_GAP_TIMEOUT:
    pulses = coin_pulse_count
    coin_pulse_count = 0
    value = PULSE_TO_VALUE.get(pulses)
    if value is None:
        print(f"[COIN] Unknown coin: {pulses} pulses")
    else:
        credit += value
        print(f"[COIN] ✓ {pulses} pulses → ₱{value} added | Total: ₱{credit}")
```

**JavaScript (paymentHardware.js):**
```javascript
if (this.coinPulseCount > 0 && now - this.coinLastPulseTime > this.COIN_GAP_TIMEOUT) {
  const pulses = this.coinPulseCount;
  this.coinPulseCount = 0;
  const value = this.PULSE_TO_VALUE[pulses];
  if (value === undefined) {
    console.log(`[COIN] ❌ Unknown coin: ${pulses} pulses`);
  } else {
    this.credit += value;
    this.totalCredit += value;
    console.log(`[COIN] ✓ ${pulses} pulses → ₱${value} added | Total: ₱${this.credit}`);
    if (this.onCoinDetected) {
      this.onCoinDetected({ pulses, value, totalCredit: this.credit, ... });
    }
  }
}
```

---

## 🧪 Testing

### Test Console Logging

Both Python and JavaScript implementations log to console with similar formats:

**Python Output:**
```
[COIN] Pulse! count = 1
[COIN] Pulse! count = 2
[COIN] ✓ 2 pulses → ₱5 added | Total: ₱5
[BILL] Pulse! count = 1
[BILL] ✓ 1 pulses → ₱10 added | Total: ₱15
[DEBUG] COIN GPIO17=HIGH (pulses=0) | BILL GPIO22=HIGH (pulses=0) | Credit=₱15
```

**JavaScript Output (Browser Console):**
```
🔧 Payment Hardware Initializing...
   Coin → GPIO 17 | Bill → GPIO 22
   Coin pulse map: {"1":1,"2":5,"5":5,"10":10,"20":20}
   Bill: ₱10 per pulse

✅ Coin & Bill Acceptor Ready... (Monitoring Active)

💰 Coin Detected: { pulses: 2, value: 5, totalCredit: 5, timestamp: "..." }
[COIN] ✓ 2 pulses → ₱5 added | Total: ₱5

💵 Bill Detected: { pulses: 1, amount: 10, totalCredit: 15, timestamp: "..." }
[BILL] ✓ 1 pulses → ₱10 added | Total: ₱15

[DEBUG] COIN GPIO17=HIGH (pulses=0) | BILL GPIO22=HIGH (pulses=0) | Credit=₱15
```

### Simulating Hardware Events

**In Browser (PaymentPage.js):**
```javascript
// Click ₱5 coin button simulates coin pulse
insertMoney(5)
// → console: 📝 [SIMULATION] Inserting coin with 2.32... pulse(s)...
// → console: [COIN] Pulse! count = 1
// → console: [COIN] ✓ 2 pulses → ₱5 added | Total: ₱5
// → UI logs display: [HH:MM:SS] [COIN] ✓ 2 pulses → ₱5 | Total: ₱5
```

**Via MQTT (mqtt_payment_backend.js):**
```bash
mosquitto_pub -t "ctu-kiosk/payment/coin" -m '{"pulses": 2}'
# → Server console: [COIN] ✓ 2 pulses → ₱5 | Total: ₱5
# → Broadcasts to all WebSocket clients
```

---

## 🚀 Running the System

### Backend Setup

```bash
# Install dependencies
npm install mqtt ws express

# Start backend server
node mqtt_payment_backend.js

# Output:
# ============================================================
# 🚀 CTU-Kiosk Payment Backend Started
# ============================================================
# 📡 MQTT Broker: mqtt://localhost:1883
# 🌐 WebSocket Server: ws://localhost:8081
# 🔌 REST API: http://localhost:8081
# ============================================================
```

### Frontend Setup

```bash
# Start React app
npm start

# Navigate to Payment Page
# Should see "Payment Hardware Initializing..." in console
```

### Raspberry Pi Setup

```bash
# Run payment GPIO script
python3 payment_gpio_mqtt.py

# On coin insertion: publishes to ctu-kiosk/payment/coin
# On bill insertion: publishes to ctu-kiosk/payment/bill
```

---

## 📊 Event Data Structures

### Coin Detected Event
```javascript
{
  type: "coin",
  pulses: 2,           // Number of pulses in burst
  value: 5,            // Peso value from PULSE_TO_VALUE map
  totalCredit: 105,    // Session total
  timestamp: "2026-02-21T10:30:45.123Z",
  gpioPin: 17          // GPIO pin number
}
```

### Bill Detected Event
```javascript
{
  type: "bill",
  pulses: 1,           // Number of pulses in burst
  amount: 10,          // ₱ per pulse × pulses
  totalCredit: 110,    // Session total
  timestamp: "2026-02-21T10:30:46.456Z",
  gpioPin: 22
}
```

### Payment Update Event
```javascript
{
  type: "coin" | "bill",
  amount: 5,           // Amount added
  total: 105           // Running total
}
```

---

## 🔐 Configuration Options

### Environment Variables

```bash
# MQTT Broker URL (default: mqtt://localhost:1883)
MQTT_BROKER=mqtt://192.168.1.100:1883

# WebSocket Server Port (default: 8081)
WS_PORT=9000

# Log Level (default: info)
LOG_LEVEL=debug
```

### Hardware Parameters

All configurable in `paymentHardware.js` and `mqtt_payment_backend.js`:

```javascript
COIN_GAP_TIMEOUT = 0.5        // 500ms to wait for burst end
BILL_DONE_TIMEOUT = 0.25      // 250ms to wait for burst end
COIN_DEBOUNCE_MS = 50         // 50ms bounce suppression
BILL_DEBOUNCE_MS = 50

PULSE_TO_VALUE = {
  1: 1,                        // 1 pulse = ₱1
  2: 5,                        // 2 pulses = ₱5
  5: 5,                        // etc.
  10: 10,
  20: 20
}

BILL_VALUE_PER_PULSE = 10     // Each pulse = ₱10
```

---

## 🐛 Debugging

### Check Browser Console
```javascript
// See all hardware events
console.log(paymentHardware.getStatus())

// Get current credit
paymentHardware.getCredit() // → 105

// Get total credit (lifetime)
paymentHardware.getTotalCredit() // → 500
```

### Check Backend Logs
```bash
# See all MQTT messages
mosquitto_sub -t "ctu-kiosk/payment/#" -v

# Check backend status
curl http://localhost:8081/status | jq

# View transaction history
curl http://localhost:8081/transactions | jq
```

### MQTT Publishing (Test)
```bash
# Simulate coin
mosquitto_pub -t "ctu-kiosk/payment/coin" -m '{"pulses": 1}'

# Simulate bill  
mosquitto_pub -t "ctu-kiosk/payment/bill" -m '{"pulses": 2}'
```

---

## ✅ Features Implemented

- [x] Pulse detection logic (JavaScript port of Python)
- [x] Debouncing (50ms threshold)
- [x] Burst processing with timeouts
- [x] Pulse-to-value mapping
- [x] Credit tracking (session + lifetime)
- [x] Hardware state management
- [x] Event callbacks
- [x] Console logging with timestamps
- [x] Real-time browser logs display
- [x] MQTT integration
- [x] WebSocket broadcasting
- [x] REST API endpoints
- [x] Change dispensing
- [x] Payment state reset
- [x] Hardware simulation (for testing)
- [x] Transaction history
- [x] Graceful shutdown

---

## 📝 Integration Points

### PaymentPage.js Usage
```javascript
import paymentHardware from '../utils/paymentHardware';

// Initialize
paymentHardware.initialize({
  onCoinDetected: handleCoin,
  onBillDetected: handleBill,
  onPaymentUpdate: updateUI
});

// Start monitoring
paymentHardware.startMonitoring();

// Simulate (for testing)
paymentHardware.simulateCoinInsertion(2);
paymentHardware.simulateBillInsertion(1);

// Get current state
const status = paymentHardware.getStatus();
const credit = paymentHardware.getCredit();

// Cleanup
paymentHardware.stopMonitoring();
```

### MQTT Backend
```javascript
// Automatically:
// 1. Listens for bill/coin MQTT messages
// 2. Processes pulse bursts
// 3. Broadcasts to all connected WebSocket clients
// 4. Maintains payment state
// 5. Handles dispense commands
```

---

## 🎯 Summary

The conversion successfully ports the Python hardware simulation logic to JavaScript while:

✅ Maintaining identical pulse detection algorithms  
✅ Adding React component integration  
✅ Creating a professional Node.js backend  
✅ Implementing MQTT broker support  
✅ Adding WebSocket real-time communication  
✅ Providing REST API for manual control  
✅ Logging all events to browser + server console  
✅ Tracking payment history  
✅ Supporting hardware simulation for testing  

This creates a complete, production-ready payment hardware integration system for the CTU-Kiosk!
