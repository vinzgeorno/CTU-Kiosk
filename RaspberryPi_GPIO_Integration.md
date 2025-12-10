# Raspberry Pi GPIO Integration Guide for CTU-Kiosk

This guide explains how the `payment_gpio.py` script integrates the Raspberry Pi's GPIO pins with the CTU-Kiosk application to enable hardware payment functionality (bill acceptor, coin acceptor, and change dispenser).

---

## Hardware Connections

- **GPIO 17 (Pin 11):** Bill Acceptor input
- **GPIO 27 (Pin 23):** Coin Acceptor input
- **GPIO 18 (Pin 12):** Servo Motor output (for change dispenser)

Wire each device to the specified GPIO pins on your Raspberry Pi 4B. Use appropriate resistors and protection circuitry as required by your hardware.

---

## How the Script Works

1. **Setup**
   - The script uses the `RPi.GPIO` library to configure the pins:
     - Bill and coin acceptors are set as input pins with pull-down resistors.
     - The servo motor is set as a PWM output.

2. **Event Detection**
   - The script listens for rising edge signals (i.e., when a bill or coin is inserted) on the bill and coin acceptor pins.
   - When a signal is detected, the script triggers a callback function that can notify the main application (e.g., via file, socket, or API call).

3. **Change Dispensing**
   - The script provides a `dispense_change()` function to control the servo motor and physically dispense coins as change.

4. **Cleanup**
   - On exit (SIGINT/SIGTERM), the script safely stops the servo and cleans up GPIO resources.

---

## Integration with the Main Application (Using MQTT)

### System Architecture

- **MQTT Broker**: Central hub for message exchange (e.g., Mosquitto running on the Pi or a server).
- **Python Script**: Publishes events (bill/coin inserted) and subscribes to commands (dispense change) via MQTT.
- **Node.js Backend**: Subscribes to payment events and publishes commands to the Pi via MQTT.
- **React Frontend**: Communicates with Node.js backend (WebSocket/HTTP) for real-time UI updates.

### MQTT Topics (Suggested)

- `ctu-kiosk/payment/bill` — Published by Python when a bill is inserted.
- `ctu-kiosk/payment/coin` — Published by Python when a coin is inserted.
- `ctu-kiosk/payment/dispense` — Subscribed by Python; backend publishes here to trigger change dispensing.
- `ctu-kiosk/payment/status` — Python can publish device status/heartbeat.

### Example Workflow

1. User selects payment method on the kiosk UI.
2. User inserts a bill/coin; the hardware triggers the GPIO pin.
3. The Python script detects the event and publishes a message to the MQTT broker.
4. Node.js backend receives the event and updates the UI via WebSocket/HTTP.
5. If change is required, backend publishes a dispense command to MQTT, which the Python script receives and actuates the servo.

### Implementation Notes

- **Python**: Use the `paho-mqtt` library to publish/subscribe to MQTT topics.
- **Node.js**: Use the `mqtt` npm package to interact with the broker.
- **Frontend**: No direct MQTT connection; all real-time updates are relayed by the backend.

### Example MQTT Message (bill inserted)
```json
{
  "amount": 20,
  "timestamp": "2025-12-10T08:00:00Z"
}
```

### Security & Reliability
- Use authentication for your MQTT broker.
- Handle reconnections and message delivery confirmations in both Python and Node.js.

### References
- [paho-mqtt Python docs](https://www.eclipse.org/paho/index.php?page=clients/python/index.php)
- [mqtt.js Node.js docs](https://github.com/mqttjs/MQTT.js)
- [Mosquitto MQTT Broker](https://mosquitto.org/)

---

## Requirements

- Raspberry Pi OS
- Python 3
- `RPi.GPIO` library (`pip install RPi.GPIO`)

---

## Extending the Script

- Add communication logic (HTTP/WebSocket, etc.) as needed for your integration.
- Customize the servo timings for your specific change dispenser hardware.

---

## Safety Notes

- Test each hardware component individually before full integration.
- Always power off the Raspberry Pi before wiring hardware.

---

For further assistance, extend the `payment_gpio.py` script to fit your integration method of choice.
