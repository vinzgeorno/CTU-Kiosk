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
COIN_ACCEPTOR_PIN = 27   # Pin 23
#SERVO_PIN = 18           # Pin 12

# MQTT config
BROKER = 'localhost'  # or IP of your MQTT broker
PORT = 1883
TOPIC_BILL = 'ctu-kiosk/payment/bill'
TOPIC_COIN = 'ctu-kiosk/payment/coin'
TOPIC_DISPENSE = 'ctu-kiosk/payment/dispense'

# Setup GPIO
GPIO.setmode(GPIO.BCM)
GPIO.setup(BILL_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(COIN_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
#GPIO.setup(SERVO_PIN, GPIO.OUT)
#servo = GPIO.PWM(SERVO_PIN, 50)
#servo.start(0)

# MQTT callbacks
def on_connect(client, userdata, flags, rc):
    print('Connected to MQTT broker')
    client.subscribe(TOPIC_DISPENSE)

def on_message(client, userdata, msg):
    if msg.topic == TOPIC_DISPENSE:
        print('Dispense command received')
        dispense_change()

def dispense_change():
    servo.ChangeDutyCycle(7.5)
    time.sleep(0.5)
    servo.ChangeDutyCycle(2.5)
    time.sleep(0.5)
    servo.ChangeDutyCycle(0)

# GPIO event callbacks
def bill_inserted_callback(channel):
    payload = json.dumps({"amount": 20, "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
    mqtt_client.publish(TOPIC_BILL, payload)
    print('Bill inserted, published to MQTT')

def coin_inserted_callback(channel):
    payload = json.dumps({"amount": 5, "timestamp": time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())})
    mqtt_client.publish(TOPIC_COIN, payload)
    print('Coin inserted, published to MQTT')

# Setup MQTT client
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message
mqtt_client.connect(BROKER, PORT, 60)

# Register GPIO events
GPIO.add_event_detect(BILL_ACCEPTOR_PIN, GPIO.RISING, callback=bill_inserted_callback, bouncetime=300)
GPIO.add_event_detect(COIN_ACCEPTOR_PIN, GPIO.RISING, callback=coin_inserted_callback, bouncetime=200)

def cleanup(signum, frame):
    servo.stop()
    GPIO.cleanup()
    mqtt_client.disconnect()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print('Payment GPIO+MQTT integration running. Press Ctrl+C to exit.')

mqtt_client.loop_start()
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    cleanup(None, None)
