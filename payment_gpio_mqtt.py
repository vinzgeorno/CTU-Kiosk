#!/usr/bin/env python3
"""
Combined Coin & Bill Acceptor Script for Raspberry Pi (MQTT Edition)
Mirrors test.py logic with MQTT publishing for real-time frontend sync
- Coin Acceptor: GPIO 2 (physical pin 3)
- Bill Acceptor: GPIO 22 (physical pin 15)
"""

import RPi.GPIO as GPIO
import time
import signal
import sys
import json
import paho.mqtt.client as mqtt

# ── Pin assignments ───────────────────────────────────────────────
COIN_PIN = 2
BILL_PIN = 22

# ── MQTT config ───────────────────────────────────────────────────
BROKER = 'localhost'  # or IP of your MQTT broker
PORT = 1883
TOPIC_BILL = 'ctu-kiosk/payment/bill'
TOPIC_COIN = 'ctu-kiosk/payment/coin'
TOPIC_DISPENSE = 'ctu-kiosk/payment/dispense'

# ── Shared state ──────────────────────────────────────────────────
credit = 0
last_publish_time = 0

# ── Coin config ───────────────────────────────────────────────────
coin_pulse_count = 0
coin_last_pulse_time = 0.0
COIN_GAP_TIMEOUT = 0.5   # 500ms gap = end of coin pulse burst
COIN_DEBOUNCE_MS = 50

PULSE_TO_VALUE = {
    1: 1,
    2: 5,
    5: 5,
    10: 10,
    20: 20
}

# ── Bill config ───────────────────────────────────────────────────
bill_pulse_count = 0
bill_last_pulse_time = 0.0
BILL_VALUE_PER_PULSE = 10  # 1 pulse = ₱10
BILL_DONE_TIMEOUT = 0.25   # 250ms gap = end of bill pulse burst
BILL_DEBOUNCE_MS = 50

# ── DEBUG: Track all pulses received ───────────────────────────────
pulse_log = []
MAX_PULSE_LOG = 100


def debug_print_pulses(source, pulse_count, value=None):
    """Debug function to print pulses received from actual components to terminal"""
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())
    
    if value:
        log_entry = f"[{timestamp}] [DEBUG] {source}: {pulse_count} pulses → ₱{value}"
    else:
        log_entry = f"[{timestamp}] [DEBUG] {source}: Real pulse detected! Count: {pulse_count}"
    
    print(log_entry)
    pulse_log.append(log_entry)
    
    # Keep only last 100 entries
    if len(pulse_log) > MAX_PULSE_LOG:
        pulse_log.pop(0)


# ── MQTT Callbacks ────────────────────────────────────────────────

def on_connect(client, userdata, flags, reason_code, properties=None):
    """On successful MQTT connection"""
    print(f"✅ [MQTT] Connected to broker at {BROKER}:{PORT}, reason_code: {reason_code}")
    if reason_code == 0:
        client.subscribe(TOPIC_DISPENSE)
        print(f"📡 [MQTT] Subscribed to {TOPIC_DISPENSE}")
    else:
        print(f"❌ [MQTT] Connection failed with code {reason_code}")


def on_message(client, userdata, msg):
    """Handle incoming MQTT messages"""
    if msg.topic == TOPIC_DISPENSE:
        try:
            data = json.loads(msg.payload.decode())
            print(f"📨 [MQTT] Dispense command received: ₱{data.get('amount', 0)}")
            # Placeholder for servo control when hardware is ready
        except json.JSONDecodeError:
            print(f"❌ [MQTT] Invalid JSON in dispense message")


def on_disconnect(client, userdata, disconnect_flags, reason_code, properties=None):
    """On MQTT disconnect"""
    print(f"🔌 [MQTT] Disconnected with reason code {reason_code}")
    if reason_code != 0:
        print(f"❌ [MQTT] Unexpected disconnection, attempting to reconnect...")


# ── GPIO Callbacks ────────────────────────────────────────────────

def coin_pulse_callback(channel):
    """Real coin detector callback - detects pulses from actual hardware"""
    global coin_pulse_count, coin_last_pulse_time, credit
    now = time.time()
    
    if (now - coin_last_pulse_time) > (COIN_DEBOUNCE_MS / 1000.0):
        coin_pulse_count += 1
        coin_last_pulse_time = now
        debug_print_pulses("COIN", coin_pulse_count)


def bill_pulse_callback(channel):
    """Real bill detector callback - detects pulses from actual hardware"""
    global bill_pulse_count, bill_last_pulse_time, credit
    now = time.time()
    
    if (now - bill_last_pulse_time) > (BILL_DEBOUNCE_MS / 1000.0):
        bill_pulse_count += 1
        bill_last_pulse_time = now
        debug_print_pulses("BILL", bill_pulse_count)


# ── Process & Publish Events ──────────────────────────────────────

def publish_coin_event(mqtt_client, pulses):
    """Publish coin event to MQTT"""
    global credit
    value = PULSE_TO_VALUE.get(pulses)
    
    if value is None:
        print(f"❌ [COIN] Unknown coin: {pulses} pulses")
        return
    
    credit += value
    debug_print_pulses("COIN_COMPLETE", pulses, value)
    
    payload = json.dumps({
        "pulses": pulses,
        "value": value,
        "totalCredit": credit,
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "gpioPin": COIN_PIN
    })
    
    mqtt_client.publish(TOPIC_COIN, payload)
    print(f"✅ [MQTT] Published COIN event: ₱{value} | Total: ₱{credit}")


def publish_bill_event(mqtt_client, pulses):
    """Publish bill event to MQTT"""
    global credit
    added = pulses * BILL_VALUE_PER_PULSE
    credit += added
    debug_print_pulses("BILL_COMPLETE", pulses, added)
    
    payload = json.dumps({
        "pulses": pulses,
        "amount": added,
        "totalCredit": credit,
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        "gpioPin": BILL_PIN
    })
    
    mqtt_client.publish(TOPIC_BILL, payload)
    print(f"✅ [MQTT] Published BILL event: ₱{added} | Total: ₱{credit}")


# ── Main Processing Loop ──────────────────────────────────────────

def process_payment_events(mqtt_client):
    """Main loop to process coin/bill bursts"""
    global coin_pulse_count, bill_pulse_count
    global coin_last_pulse_time, bill_last_pulse_time
    
    now = time.time()
    
    # Process coin burst
    if coin_pulse_count > 0 and (now - coin_last_pulse_time) > COIN_GAP_TIMEOUT:
        pulses = coin_pulse_count
        coin_pulse_count = 0
        publish_coin_event(mqtt_client, pulses)
    
    # Process bill burst
    if bill_pulse_count > 0 and (now - bill_last_pulse_time) > BILL_DONE_TIMEOUT:
        pulses = bill_pulse_count
        bill_pulse_count = 0
        publish_bill_event(mqtt_client, pulses)


# ── Main ──────────────────────────────────────────────────────────

def main():
    global coin_pulse_count, bill_pulse_count, credit
    
    # Setup GPIO
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(COIN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(BILL_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    
    # Setup MQTT
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    mqtt_client.on_connect = on_connect
    mqtt_client.on_message = on_message
    mqtt_client.on_disconnect = on_disconnect
    
    print("\n" + "="*60)
    print("🚀 CTU-Kiosk Payment Hardware (MQTT Bridge) Starting...")
    print("="*60)
    print(f"💰 Coin → GPIO {COIN_PIN} | 💵 Bill → GPIO {BILL_PIN}")
    print(f"📡 MQTT Broker: {BROKER}:{PORT}")
    print(f"💰 Coin pulse map: {PULSE_TO_VALUE}")
    print(f"💵 Bill: ₱{BILL_VALUE_PER_PULSE} per pulse\n")
    
    try:
        mqtt_client.connect(BROKER, PORT, 60)
        mqtt_client.loop_start()
        
        # Add GPIO event detection
        GPIO.add_event_detect(COIN_PIN, GPIO.FALLING,
                            callback=coin_pulse_callback,
                            bouncetime=COIN_DEBOUNCE_MS)
        GPIO.add_event_detect(BILL_PIN, GPIO.FALLING,
                            callback=bill_pulse_callback,
                            bouncetime=BILL_DEBOUNCE_MS)
        
        print("✅ Coin & Bill Acceptor Ready... (Press CTRL+C to exit)")
        print(f"📋 All pulses logged. Type 'show_logs' to debug.\n")
        
        last_debug_time = time.time()
        
        while True:
            now = time.time()
            
            # Process payment events
            process_payment_events(mqtt_client)
            
            # Debug every 2s
            if now - last_debug_time > 2.0:
                coin_state = GPIO.input(COIN_PIN)
                bill_state = GPIO.input(BILL_PIN)
                print(f"[DEBUG] COIN GPIO{COIN_PIN}={coin_state} (pulses={coin_pulse_count}) | "
                      f"BILL GPIO{BILL_PIN}={bill_state} (pulses={bill_pulse_count}) | "
                      f"Credit=₱{credit}", flush=True)
                last_debug_time = now
            
            time.sleep(0.01)
    
    except KeyboardInterrupt:
        print("\n\n🛑 Stopping...")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        GPIO.cleanup()
        mqtt_client.loop_stop()
        mqtt_client.disconnect()
        print("✅ Cleanup complete")


if __name__ == "__main__":
    main()

# --------------- CLEANUP HANDLER ---------------

def cleanup(signum, frame):
    print("Cleaning up and exiting...")
    GPIO.cleanup()
    mqtt_client.disconnect()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print('Payment GPIO+MQTT integration running. Press Ctrl+C to exit.')

# --------------- MAIN LOOP ---------------

mqtt_client.loop_start()

try:
    while True:
        now = time.time()
        # --- COIN BURST GROUPING LOGIC ---
        global pulse_count, last_pulse_time
        if pulse_count > 0 and (now - last_pulse_time) > COIN_GAP_TIMEOUT:
            pulses = pulse_count
            pulse_count = 0
            value = PULSE_TO_VALUE.get(pulses, None)
            if value is None:
                print(f"Unknown coin: {pulses} pulses")
            else:
                payload = json.dumps({
                    "amount": value,
                    "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
                })
                mqtt_client.publish(TOPIC_COIN, payload)
                print(f"Coin detected: {pulses} pulses -> +{value} credit. Published to MQTT.")
        # Print pin states every 0.5s for debug
        bill_state = GPIO.input(BILL_ACCEPTOR_PIN)
        coin_state = GPIO.input(COIN_ACCEPTOR_PIN)
        print(f'[DEBUG] Bill GPIO {BILL_ACCEPTOR_PIN}: {bill_state} | Coin GPIO {COIN_ACCEPTOR_PIN}: {coin_state}')
        time.sleep(0.5)
except KeyboardInterrupt:
    cleanup(None, None)