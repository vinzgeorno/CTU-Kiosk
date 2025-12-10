import RPi.GPIO as GPIO
import time

PIN = 11  # test bill acceptor pin

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

# Try both pull-up or pull-down
GPIO.setup(PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

print("Watching pin", PIN)

while True:
    print(GPIO.input(PIN))
    time.sleep(0.2)
