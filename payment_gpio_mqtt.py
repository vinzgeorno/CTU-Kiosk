"""
Python script for Raspberry Pi: Payment hardware integration using RPi.GPIO and MQTT (paho-mqtt).
Publishes bill/coin events and listens for change dispense commands via MQTT.
"""

import RPi.GPIO as GPIO
import time
import signal
import sys
import json
import paho.mqtt.client as mqtt

# GPIO pin numbers (BCM mode)
BILL_ACCEPTOR_PIN = 17   # Pin 11
COIN_ACCEPTOR_PIN = 27   # Pin 13 (BCM 27 = physical 13)

# MQTT config
BROKER = 'localhost'  # or IP of your MQTT broker
PORT = 1883
TOPIC_BILL = 'ctu-kiosk/payment/bill'
TOPIC_COIN = 'ctu-kiosk/payment/coin'
TOPIC_DISPENSE = 'ctu-kiosk/payment/dispense'

# ---------------- GPIO SETUP ----------------
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

# Using pull-downs, expecting RISING pulses from acceptors
GPIO.setup(BILL_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(COIN_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

# --------------- MQTT CALLBACKS ---------------

# New v2 signature: (client, userdata, flags, reason_code, properties)
def on_connect(client, userdata, flags, reason_code, properties=None):
    print("Connected to MQTT broker, reason_code:", reason_code)
    if reason_code == 0:  # Success
        client.subscribe(TOPIC_DISPENSE)
    else:
        print("MQTT connection failed with code", reason_code)

def on_message(client, userdata, msg):
    if msg.topic == TOPIC_DISPENSE:
        print('Dispense command received (servo disabled for now)')
        # dispense_change()  # when you wire the servo, call this

# --------------- DISPENSE (SERVO) STUB ---------------

def dispense_change():
    # Placeholder: implement servo control later
    print("Dispense change requested (servo not implemented yet).")

# --------------- GPIO EVENT CALLBACKS ---------------

def bill_inserted_callback(channel):
    print(f'[CALLBACK] Bill acceptor pulse detected on GPIO {channel} (value={GPIO.input(channel)})')
    payload = json.dumps({
        "amount": 20,
        "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    })
    mqtt_client.publish(TOPIC_BILL, payload)
    print('Bill inserted, published to MQTT')

def coin_pulse_callback(channel):
    global pulse_count, last_pulse_time
    now = time.time()
    # Simple debounce: ignore pulses too close together (<5ms)
    if now - last_pulse_time < 0.005:
        return
    pulse_count += 1
    last_pulse_time = now
    print(f"Pulse! current burst pulses: {pulse_count}")

# --------------- MQTT CLIENT SETUP ---------------

mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER, PORT, 60)

# --------------- GPIO EDGE DETECTION ---------------

try:
    GPIO.add_event_detect(
        BILL_ACCEPTOR_PIN,
        GPIO.RISING,
        callback=bill_inserted_callback,
        bouncetime=300
    )
    GPIO.add_event_detect(
        COIN_ACCEPTOR_PIN,
        GPIO.FALLING,
        callback=coin_pulse_callback,
        bouncetime=5
    )
except RuntimeError as e:
    print("Failed to add GPIO edge detection:", e)
    GPIO.cleanup()
    sys.exit(1)

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