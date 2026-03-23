# Change Dispenser Auto-Dispense Setup

## Overview
The change dispenser automatically dispenses change using ₱5 coins after payment is confirmed. The system only uses ₱5 coins since all transactions end in either ₱5 or ₱0.

## Architecture

### **On-Demand GPIO Initialization (No Startup Jitter!)**

The servo is **NOT initialized at startup**. This solves the jitter problem:

```
┌─ System Startup ─────────────┐
│                              │
│  • Coin/Bill GPIO: Active ✓  │
│  • Servo GPIO: OFF ✓✓✓       │   ← No jitter!
│  • MQTT: Connected ✓         │
│                              │
└──────────────────────────────┘
           ↓
     User pays
           ↓
    Payment confirmed
           ↓
    Change detected
           ↓
┌─ Servo Initialize On-Demand ─┐
│                               │
│  • Initialize servo GPIO      │
│  • Start PWM at neutral       │
│  • Dispense coins             │
│  • Cleanup & release GPIO     │
│                               │
└───────────────────────────────┘
```

**Benefits:**
- ✅ Zero startup jitter
- ✅ Servo only powered when needed
- ✅ Cleaner GPIO management
- ✅ Longer servo lifespan

### 1. **Payment Flow**
```
User inserts payment → Amount calculated → "Confirm Payment" clicked
                                              ↓
                                    System processes payment
                                              ↓
                                    Change = Inserted - Price
                                              ↓
                        Is change > 0 AND divisible by 5?
                                    ↓              ↓
                                   YES            NO
                                    ↓              ↓
                            Auto-Dispense    Message shown
                              coins              (error)
                                    ↓
                              Servo dispenses
                            (number of ₱5 coins)
                                    ↓
                            Navigate to receipt
```

### 2. **Frontend (React) - PaymentPage.js**
When "Confirm Payment" is clicked:
- Calculates change amount
- Validates change is divisible by 5
- Sends MQTT command via WebSocket to dispense hardware
- Displays success/error message in payment log

**Key Code:**
```javascript
if (changeAmount > 0) {
  if (changeAmount % 5 === 0) {
    const dispenseResult = paymentHardware.dispenseChange(changeAmount);
    // Triggers servo via MQTT
  }
}
```

### 3. **Backend (Node.js) - mqtt_payment_backend.js**
WebSocket server receives dispense command and forwards to MQTT:
- Receives dispense request with amount
- Validates amount
- Publishes to `ctu-kiosk/payment/dispense` MQTT topic
- Logs transaction

### 4. **Python GPIO (Raspberry Pi) - payment_gpio_mqtt.py**
MQTT subscriber listens and controls servo:
- Receives amount from MQTT topic
- Calculates number of coins: `coins = amount / 5`
- Drives servo to dispense coins
- Logs each coin dispensed

## Hardware Setup

### Servo Connection (GPIO)
```
Servo Signal Wire  → GPIO 17 (or GPIO 18 as backup)
Servo Power (Red)  → 5V Power
Servo Ground (Blk) → GND
```

### Servo Specifications
- **Rest Angle:** 0°
- **Push Angle:** 85°
- **Movement Delay:** 300ms
- **Gap Between Coins:** 500ms
- **Coins Supported:** ₱5 only

## Valid Change Amounts

✅ **Valid** (divisible by 5):
- ₱5 → 1 coin
- ₱10 → 2 coins
- ₱15 → 3 coins
- ₱20 → 4 coins
- ₱25 → 5 coins
- etc.

❌ **Invalid** (won't dispense):
- ₱1, ₱2, ₱3, ₱4
- ₱6, ₱7, ₱8, ₱9
- ₱11, ₱12, ₱13, ₱14
- Any amount not divisible by 5

## Testing the Auto-Disperse

### 1. Test Servo Manually
```bash
cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk
sudo python3 test_servo.py
```

Select option to dispense 1, 5, or 10 coins
Run the Python backend:
```bash
cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk
source escpos-env/bin/activate
sudo python3 payment_gpio_mqtt.py
```

In another terminal, publish test command:
```bash
mosquitto_pub -t ctu-kiosk/payment/dispense -m '{"amount": 15}'
```

Expected output:
```
💰 Change calculation: ₱15 = 3 × ₱5 coins
🎯 === AUTO-DISPENSE: 3 × ₱5 coins (Total: ₱15) ===
[1/3] Dispensing ₱5 coin...
🔧 Servo angle set to 85° (PWM duty: 6.7%)
💰 Coin dispensed
[2/3] Dispensing ₱5 coin...
...
✅ Successfully dispensed ₱15 as change
```

### 3. Test Full Payment Flow
1. Start backend: `npm start` (or `node mqtt_payment_backend.js`)
2. Start React app: `npm start`
3. Go through payment page
4. Insert payment (or simulate)
5. Confirm payment with change
6. Observe auto-dispense in Python console

## Troubleshooting

### Servo Not Responding
- Check GPIO 17/18 is not in use
- Verify 5V power connected to servo
- Run with `sudo`: `sudo python3 payment_gpio_mqtt.py`
- Check servo PWM frequency: 50Hz

### Invalid Change Amount
- System rejects change not divisible by 5
- Design limitation: only ₱5 coins available
- Message shown: "Cannot dispense change: ₱X not divisible by 5"

### MQTT Not Connected
- Verify MQTT broker running: `mosquitto -v`
- Check connection URL in both files
- Default: `mqtt://localhost:1883`

### No Coins Dispensing
- Check servo angle values (0° rest, 85° push)
- Verify servo movement delays (300ms each)
- Check coin gap timeout (500ms between coins)
- Test servo manually first with `test_servo.py`

## Files Modified

| File | Changes |
|------|---------|
| `payment_gpio_mqtt.py` | **On-demand servo init** - only initializes GPIO when dispense command received, eliminates startup jitter |
| `test_servo.py` | Updated with on-demand initialization |
| `gpio_diagnostic.py` | Added neutral startup position |
| `src/components/PaymentPage.js` | Auto-dispense trigger on payment confirm |
| `src/utils/paymentHardware.js` | MQTT command formatting for dispense |
| `mqtt_payment_backend.js` | (Already had dispense support)

## Configuration Values

All values in `payment_gpio_mqtt.py`:

```python
# Servo Pins & Movement
SERVO_PIN = 17                 # GPIO pin
SERVO_REST_ANGLE = 0           # 0° = rest
SERVO_PUSH_ANGLE = 85          # 85° = push coin
SERVO_MOVE_DELAY = 0.3         # 300ms movement
SERVO_COIN_GAP = 0.5           # 500ms between coins
SERVO_PWM_FREQ = 50            # 50Hz standard servo
```

## Future Enhancements

- Add other coin denominations (₱1, ₱10 multi-denomination)
- Handle partial change in mixed coins
- Add servo failure recovery
- Add remaining coin count detection
