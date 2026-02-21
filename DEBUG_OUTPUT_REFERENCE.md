# Terminal Debug Output Reference

## What You'll See When Running the Real Hardware Integration

### 1. Raspberry Pi Script Output (payment_gpio_mqtt.py)

```bash
$ python3 payment_gpio_mqtt.py

============================================================
🚀 CTU-Kiosk Payment Hardware (MQTT Bridge) Starting...
============================================================
💰 Coin → GPIO 2 | 💵 Bill → GPIO 22
📡 MQTT Broker: localhost:1883
💰 Coin pulse map: {'1': 1, '2': 5, '5': 5, '10': 10, '20': 20}
💵 Bill: ₱10 per pulse

✅ Coin & Bill Acceptor Ready... (Press CTRL+C to exit)
📋 All pulses logged. Type 'show_logs' to debug.

[DEBUG] COIN GPIO2=1 (pulses=0) | BILL GPIO22=1 (pulses=0) | Credit=₱0

# When coin is inserted:
[2026-02-21 14:30:45] [DEBUG] COIN: Real pulse detected! Count: 1
[2026-02-21 14:30:45] [DEBUG] COIN: Real pulse detected! Count: 2
[2026-02-21 14:30:46] [DEBUG] COIN_COMPLETE: 2 pulses → ₱5
✅ [MQTT] Published COIN event: ₱5 | Total: ₱5

# When bill is inserted:
[2026-02-21 14:31:00] [DEBUG] BILL: Real pulse detected! Count: 1
[2026-02-21 14:31:00] [DEBUG] BILL: Real pulse detected! Count: 2
[2026-02-21 14:31:01] [DEBUG] BILL_COMPLETE: 2 pulses → ₱20
✅ [MQTT] Published BILL event: ₱20 | Total: ₱25
```

### 2. Node.js Backend Output (mqtt_payment_backend.js)

```bash
$ node mqtt_payment_backend.js

🔌 [MQTT] Connecting to broker: mqtt://localhost:1883
✅ [MQTT] Connected to broker
📡 [MQTT] Subscribed to: ctu-kiosk/payment/bill,ctu-kiosk/payment/coin

============================================================
🚀 CTU-Kiosk Payment Backend Started
============================================================
📡 MQTT Broker: mqtt://localhost:1883
🌐 WebSocket Server: ws://localhost:8081
🔌 REST API: http://localhost:8081
============================================================

🌐 [WebSocket] Client connected. Total clients: 1

# When coin pulse received:
📊 [RAW COIN PULSE] Received MQTT message: {"pulses":2,"value":5,"totalCredit":5,"timestamp":"2026-02-21T14:30:46Z","gpioPin":2}

════════════════════════════════════════════════════════════════════════════════
[14:30:46] ⚡ [REAL COIN PULSE] Type: COIN | Pulses: 2 | Value: ₱5 | Total: ₱5 | GPIO2
════════════════════════════════════════════════════════════════════════════════

ℹ️ [2026-02-21T14:30:46.123Z] [COIN] ✓ 2 pulses → ₱5 | Total: ₱5
📢 [WebSocket] Broadcasting: { type: 'coin', pulses: 2, value: 5, ... }

# When bill pulse received:
📊 [RAW BILL PULSE] Received MQTT message: {"pulses":2,"amount":20,"totalCredit":25,"timestamp":"2026-02-21T14:31:01Z","gpioPin":22}

════════════════════════════════════════════════════════════════════════════════
[14:31:01] ⚡ [REAL BILL PULSE] Type: BILL | Pulses: 2 | Amount: ₱20 | Total: ₱25 | GPIO22
════════════════════════════════════════════════════════════════════════════════

ℹ️ [2026-02-21T14:31:01.456Z] [BILL] ✓ 2 pulses → ₱20 | Total: ₱25
📢 [WebSocket] Broadcasting: { type: 'bill', pulses: 2, amount: 20, ... }

🌐 [WebSocket] Client disconnected. Total clients: 0
```

### 3. Frontend Browser Console (PaymentPage.js)

```javascript
// On page load:
🎯 PaymentPage Mounted - Initializing Payment Hardware
🔧 Payment Hardware Initializing...
   Coin → GPIO 2 | Bill → GPIO 22
✅ Coin & Bill Acceptor Ready... (Monitoring Active)

🔌 [WebSocket] Connecting to ws://localhost:8081...
✅ [WebSocket] Connected to payment backend
📨 [WebSocket] Received: {type: 'init', state: {...}, config: {...}}

// When coin pulse received from real hardware:
📨 [WebSocket] Received: {type: 'coin', pulses: 2, value: 5, totalCredit: 5, ...}
⚡ [REAL HARDWARE] Coin pulse detected: {pulses: 2, value: 5, ...}

// Toast/Log message in UI:
⚡ [REAL COIN] 2 pulses → ₱5 | Total: ₱5

// When bill pulse received from real hardware:
📨 [WebSocket] Received: {type: 'bill', pulses: 2, amount: 20, totalCredit: 25, ...}
⚡ [REAL HARDWARE] Bill pulse detected: {pulses: 2, amount: 20, ...}

// Toast/Log message in UI:
⚡ [REAL BILL] 2 pulses → ₱20 | Total: ₱25
```

### 4. Frontend UI Indicators

**Connection Status (Top Right):**
- ✅ Green Badge: "Live Hardware" - Connected to backend
- ⚠️ Yellow Badge: "Simulator Mode" - Backend unavailable, using UI buttons
- ❌ Red Badge: "Connection Error" - Failed to connect

**Live Hardware Pulses Section:**
```
⚡ Live Hardware Pulses
┌─────────────────────────────────────────────────┐
│ COIN     ₱5        2 pulse(s) | GPIO2 14:30:46 │
│ BILL     ₱20       2 pulse(s) | GPIO22 14:31:01│
│ COIN     ₱1        1 pulse(s) | GPIO2 14:31:05 │
└─────────────────────────────────────────────────┘
```

**Hardware Event Log Section:**
```
📋 Hardware Event Log
┌─────────────────────────────────────────────────┐
│ [14:30:44] 🌐 Real-time hardware connected... │
│ [14:30:46] ⚡ [REAL COIN] 2 pulses → ₱5       │
│ [14:31:01] ⚡ [REAL BILL] 2 pulses → ₱20      │
│ [14:31:05] ⚡ [REAL COIN] 1 pulse(s) → ₱1     │
└─────────────────────────────────────────────────┘
```

## Debugging Commands

### Check MQTT Connection
```bash
# On backend server
mosquitto_clients -h localhost
# Output shows connected clients

# Check published messages
mosquitto_sub -h localhost -t 'ctu-kiosk/payment/#'
# Shows real-time MQTT messages
```

### Check WebSocket Connection
```bash
# In browser console
console.log(ws)  // Check WebSocket state
// Output: WebSocket {url: "ws://localhost:8081", readyState: 1, ...}

# Check received messages
// (already logged to console as "📨 [WebSocket] Received")
```

### REST API Debug
```bash
# Check payment status
curl http://localhost:8081/status

# Get pulse debug logs
curl http://localhost:8081/pulse-debug-log
# Returns last 50 pulse entries

# Get transactions
curl http://localhost:8081/transactions
```

## Expected Pulse Count Values

### Coin Acceptor (GPIO 2) - PULSE_TO_VALUE
- 1 pulse → ₱1
- 2 pulses → ₱5
- 5 pulses → ₱5
- 10 pulses → ₱10
- 20 pulses → ₱20
- Any other count → "Unknown coin" error

### Bill Acceptor (GPIO 22)
- Each pulse = ₱10
- Examples:
  - 1 pulse → ₱10
  - 2 pulses → ₱20
  - 5 pulses → ₱50
  - 10 pulses → ₱100

## Common Issues & Debug Output

### Issue: No Pulses Detected
```
# Python shows:
[DEBUG] COIN GPIO2=1 (pulses=0) | BILL GPIO22=1 (pulses=0)
# Stays the same when inserting money

# Solutions:
1. Check physical connections to GPIO 2 and 22
2. Verify pull-up resistors (10kΩ)
3. Increase debounce time in code
```

### Issue: WebSocket Won't Connect
```
# Browser shows:
❌ [WebSocket] Error
⚠️ Could not connect to backend - using simulator

# Backend shows:
No "Client connected" message

# Solutions:
1. Check node server is running: lsof -i :8081
2. Check firewall: sudo ufw allow 8081
3. Check backend logs for errors
```

### Issue: Unknown Coin Error
```
# Appears when PULSE_TO_VALUE doesn't have key:
❌ [COIN] Unknown coin: 3 pulses

# Solutions:
1. Check coin mechanism pulse count
2. Update PULSE_TO_VALUE mapping for this coin type
3. Verify debounce timing isn't splitting pulses
```

## Performance Metrics to Monitor

- **Pulse latency**: Time from GPIO pulse to UI display (target: <100ms)
- **MQTT latency**: Time from Python publish to Node receive (target: <50ms)
- **WebSocket latency**: Time from Node broadcast to browser update (target: <20ms)
- **Debug log size**: Should stay <150 entries (auto-rotated)
- **Memory usage**: Node process should stay <100MB

## Stopping Everything Gracefully

```bash
# Raspberry Pi script
Press CTRL+C
# Outputs: 🛑 Stopping... ✅ Cleanup complete

# Node backend
Press CTRL+C
# Outputs: 🛑 Shutting down gracefully...
#          ✅ Server closed

# Browser
Just close or refresh
# Outputs: 🔌 [WebSocket] Disconnected from backend

# MQTT broker
mosquitto_stop  # or: systemctl stop mosquitto
```
