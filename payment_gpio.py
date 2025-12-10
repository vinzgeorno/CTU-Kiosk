# This script will run on the Raspberry Pi to interface with GPIO pins for payment hardware.
# It uses RPi.GPIO to detect bill/coin insertion and control a servo for the change dispenser.
# To be run as a background process, communicating with the main app via HTTP, WebSocket, or file/db.

import RPi.GPIO as GPIO
import time
import signal
import sys

# GPIO pin numbers (BCM mode)
BILL_ACCEPTOR_PIN = 17   # Pin 11
COIN_ACCEPTOR_PIN = 27   # Pin 23
SERVO_PIN = 18           # Pin 12

# Setup
GPIO.setmode(GPIO.BCM)
GPIO.setup(BILL_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(COIN_ACCEPTOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
GPIO.setup(SERVO_PIN, GPIO.OUT)

# Servo setup
servo = GPIO.PWM(SERVO_PIN, 50)  # 50Hz
servo.start(0)

def dispense_change():
    # Example: rotate servo to dispense coins
    servo.ChangeDutyCycle(7.5)  # adjust as needed for your servo
    time.sleep(0.5)
    servo.ChangeDutyCycle(2.5)  # return to start
    time.sleep(0.5)
    servo.ChangeDutyCycle(0)

def bill_inserted_callback(channel):
    print('Bill inserted!')
    # Here, signal to main app (e.g., via file, socket, or API)

def coin_inserted_callback(channel):
    print('Coin inserted!')
    # Here, signal to main app (e.g., via file, socket, or API)

# Add event detection
GPIO.add_event_detect(BILL_ACCEPTOR_PIN, GPIO.RISING, callback=bill_inserted_callback, bouncetime=300)
GPIO.add_event_detect(COIN_ACCEPTOR_PIN, GPIO.RISING, callback=coin_inserted_callback, bouncetime=200)

def cleanup(signum, frame):
    servo.stop()
    GPIO.cleanup()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

print('Payment GPIO integration running. Press Ctrl+C to exit.')
while True:
    time.sleep(1)
