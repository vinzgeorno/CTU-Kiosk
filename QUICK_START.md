# Quick Start Guide - Real Hardware Integration

## Prerequisites
- Raspberry Pi 4/5 with GPIO pins accessible
- Coin acceptor wired to GPIO 2 (physical pin 3)
- Bill acceptor wired to GPIO 22 (physical pin 15)
- MQTT broker running (mosquitto)
- Node.js installed on backend system
- React frontend running on port 3000

---

## One-Command Startup (Copy & Paste)

### Terminal 1: Start MQTT Broker
```bash
mosquitto -c /etc/mosquitto/mosquitto.conf
```
**Expected Output:**
```
1645436445: mosquitto version 2.0.14 starting
1645436445: Using default config from /etc/mosquitto/mosquitto.conf
1645436445: Opening ipv4 listen socket on port 1883.
```

---

### Terminal 2: Start Node Backend
```bash
cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk && node mqtt_payment_backend.js
```
**Expected Output:**
```
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
```

---

### Terminal 3: Start Raspberry Pi GPIO Script
```bash
cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk && python3 payment_gpio_mqtt.py
```
**Expected Output:**
```
============================================================
🚀 CTU-Kiosk Payment Hardware (MQTT Bridge) Starting...
============================================================
💰 Coin → GPIO 2 | 💵 Bill → GPIO 22
📡 MQTT Broker: localhost:1883
💰 Coin pulse map: {'1': 1, '2': 5, '5': 5, '10': 10, '20': 20}
💵 Bill: ₱10 per pulse

✅ Coin & Bill Acceptor Ready... (Press CTRL+C to exit)
```

---

### Terminal 4: Start React Frontend
```bash
cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk && npm start
```
**Expected Output:**
```
Compiled successfully!

You can now view ctu-kiosk in the browser.

Local:            http://localhost:3000
```

---

## System Verification Checklist

### ✅ MQTT Broker Status
```bash
# Check if mosquitto is listening on port 1883
netstat -tlnp | grep 1883
# Output: tcp  0  0 0.0.0.0:1883  0.0.0.0:*  LISTEN  12345/mosquitto

# View connected clients
mosquitto_clients
```

### ✅ Backend WebSocket Status  
```bash
# Check if Node is listening on port 8081
netstat -tlnp | grep 8081
# Output: tcp  0  0 0.0.0.0:8081  0.0.0.0:*  LISTEN  12346/node

# Get current payment state
curl http://localhost:8081/status
```

### ✅ Frontend Connection
```bash
# Open browser and navigate to
http://localhost:3000

# Check browser console (F12)
# Should show:
# ✅ [WebSocket] Connected to payment backend
# 🌐 Real-time hardware connection established
```

---

## Real-Time Monitoring

### Monitor Coin/Bill Insertions (Backend View)
```bash
# In separate terminal, watch MQTT messages
mosquitto_sub -h localhost -t 'ctu-kiosk/payment/#'

# Will show:
# ctu-kiosk/payment/coin {"pulses":2,"value":5,"totalCredit":5,...}
# ctu-kiosk/payment/bill {"pulses":2,"amount":20,"totalCredit":25,...}
```

### Monitor Backend Processing
```bash
# Backend terminal shows:
════════════════════════════════════════════════════════════════════════════════
[14:30:46] ⚡ [REAL COIN PULSE] Type: COIN | Pulses: 2 | Value: ₱5 | Total: ₱5 | GPIO2
════════════════════════════════════════════════════════════════════════════════
```

### Watch Real-Time UI Updates (Frontend)
```bash
1. Open PaymentPage in browser
2. Connection status shows "✅ Live Hardware" (top-right)
3. When coin/bill is inserted:
   - "Amount Inserted" field updates instantly with pulse animation
   - Hardware Event Log shows new entry with +₱X
   - If payment completes, "Change" field appears automatically
4. All updates sync in real-time from actual hardware
```

---

## Testing Without Real Hardware

### Option 1: Use UI Simulator Buttons
```bash
1. Keep everything running
2. Frontend shows "⚠️ Simulator Mode"
3. Click "₱20" button (or any amount)
4. Amount updates immediately
5. Good for UI/integration testing
```

### Option 2: Inject Test Pulses
```bash
# Publish test coin pulse (2 pulses = ₱5)
mosquitto_pub -h localhost -t ctu-kiosk/payment/coin \
  -m '{"pulses":2,"value":5,"totalCredit":5,"timestamp":"2026-02-21T14:30:46Z","gpioPin":2}'

# Frontend will show increase immediately
```

---

## Debugging Commands

### Check Recent Pulse Debug Log
```bash
curl http://localhost:8081/pulse-debug-log | jq .
```
**Returns:**
```json
{
  "lastEntries": [
    "[14:30:46] ⚡ [REAL COIN PULSE] Type: COIN | Pulses: 2 | Value: ₱5 | Total: ₱5 | GPIO2",
    "[14:31:01] ⚡ [REAL BILL PULSE] Type: BILL | Pulses: 2 | Amount: ₱20 | Total: ₱25 | GPIO22"
  ],
  "totalEntries": 47,
  "timestamp": "2026-02-21T14:35:00.123Z"
}
```

### Get Full Payment State
```bash
curl http://localhost:8081/status | jq .
```

### Reset Payment State
```bash
curl -X POST http://localhost:8081/reset
```

### View All Transactions
```bash
curl http://localhost:8081/transactions | jq .
```

---

## Troubleshooting Commands

### MQTT Not Connecting
```bash
# Check if broker is running
pgrep mosquitto
# Output: (PID number means it's running)

# Try to connect to broker
mosquitto_pub -h localhost -t test -m "hello"
# No error = broker working

# Check firewall
sudo ufw status | grep 1883
```

### WebSocket Not Connecting
```bash
# Check if backend is running
lsof -i :8081
# Should show node process

# Check if port is firewalled
nc -zv localhost 8081
# Should say "Connection succeeded"
```

### GPIO Not Detecting Pulses
```bash
# Check GPIO pins are accessible
gpio readall
# Should show GPIO 2 and GPIO 22 as inputs

# Check pull-up resistors are working
# Should read ~3.3V when idle (HIGH state)
gpio mode 2 input
gpio read 2
# Output: 1 (HIGH)
```

### Frontend Not Getting Real-Time Updates
```bash
# Check browser console for errors (F12)
# Should see: ✅ [WebSocket] Connected

# If sees: ❌ [WebSocket] Error
# Then backend is not running or port is blocked
```

---

## Performance Baseline

Run this after system is up and stable:

```bash
# 1. Time coin pulse throughput
# Insert sequence of coins, note start/end time
# Expected: 10-20 pulses per second

# 2. Check memory usage
ps aux | grep -E "node|python"
# node should use <100MB
# python should use <50MB

# 3. Check WebSocket lag
# Open browser console
# Insert coin
# Note time between "📨 [WebSocket] Received" and UI update
# Expected: <100ms

# 4. Monitor CPU usage during insertion
top -p $(pgrep -f python3)
# CPU should spike <20% per pulse sequence
```

---

## Clean Shutdown Procedure

```bash
# Terminal 1 (React Frontend)
Press Ctrl+C
# Output: [OK] Killed Previous Process

# Terminal 2 (Python GPIO Script)
Press Ctrl+C  
# Output: 🛑 Stopping... ✅ Cleanup complete

# Terminal 3 (Node Backend)
Press Ctrl+C
# Output: 🛑 Shutting down gracefully...
#         ✅ Server closed

# Terminal 4 (MQTT Broker)
Press Ctrl+C
# Mosquitto stops

# Verify nothing is running
lsof -i :3000,8081,1883
# Should return empty
```

---

## Production Deployment Checklist

- [ ] Test all components independently
- [ ] Verify MQTT connectivity on LAN
- [ ] Confirm GPIO connections to acceptors
- [ ] Test coin insertion with real hardware
- [ ] Test bill insertion with real hardware
- [ ] Verify frontend gets real-time updates
- [ ] Check backend debug logs are printing
- [ ] Verify change dispense works (if servo implemented)
- [ ] Test simulator fallback mode
- [ ] Monitor for 5+ minutes under load
- [ ] Check no memory leaks (all processes stable)
- [ ] Verify graceful shutdown works
- [ ] Test recovery after crash
- [ ] Document any custom timings used
- [ ] Add to startup scripts/systemd services

---

## Common Quick Fixes

| Issue | Fix |
|-------|-----|
| "Connection refused" | Start mqtt_payment_backend.js first |
| "GPIO not found" | Run Python script as root: `sudo python3` |
| "Port 8081 already in use" | Kill process: `lsof -ti :8081 \| xargs kill -9` |
| "No WebSocket connection" | Check firewall: `sudo ufw allow 8081` |
| "Pulses not showing in UI" | Check browser console (F12) for WebSocket errors |
| "MQTT messages not publishing" | Check MQTT broker: `mosquitto_clients` |
| "Frontend shows simulator mode" | Check backend is running: `lsof -i :8081` |

---

## Logs Location

```bash
# Python script output (in terminal)
/home/ctukiosk/Documents/Capstone/CTU-Kiosk/payment_gpio_mqtt.py

# Node backend output (in terminal)  
/home/ctukiosk/Documents/Capstone/CTU-Kiosk/mqtt_payment_backend.js

# React frontend build (if deployed)
/home/ctukiosk/Documents/Capstone/CTU-Kiosk/build/

# SystemD logs (if running as service)
journalctl -u ctu-kiosk-backend -f
journalctl -u ctu-kiosk-hardware -f
```

---

## Video Demo Script

```
1. Show MQTT broker starting
2. Show backend server starting, WebSocket listening
3. Show Raspberry Pi script starting, waiting for pulses
4. Open browser, navigate to PaymentPage
5. Show "✅ Live Hardware" indicator (top-right)
6. Insert coin
7. Show Python terminal: pulse detected
8. Show Backend terminal: debug pulse output (════ [REAL COIN PULSE] ════)
9. Show Frontend: "Amount Inserted" updates instantly with subtle pulse animation
10. Show Hardware Event Log shows: "⚡ [REAL COIN] +₱X"
11. Insert bill
12. Repeat steps 7-10 for bill
13. Once payment amount is reached, show "Change" field appears (green)
14. Click "Confirm Payment"
15. Show processing and navigation to ticket complete
16. Stop backend server
17. Show Frontend: "⚠️ Simulator Mode"
18. Show UI buttons still work (fallback mode)
```

---

## Next Steps

1. Deploy to production Raspberry Pi
2. Configure as systemd services for auto-start
3. Add database persistence layer
4. Implement servo control for change dispensing
5. Add cloud sync for transactions
6. Monitor real-world payment volume

---

**For detailed information, see:**
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Complete technical overview
- [REAL_HARDWARE_INTEGRATION.md](REAL_HARDWARE_INTEGRATION.md) - Integration guide
- [DEBUG_OUTPUT_REFERENCE.md](DEBUG_OUTPUT_REFERENCE.md) - Terminal output reference
