#!/bin/bash
# start_gpio.sh - Start Python GPIO/MQTT service with venv

cd /home/ctukiosk/Documents/Capstone/CTU-Kiosk

# Activate virtual environment
source escpos-env/bin/activate

# Run the GPIO script (with sudo for GPIO access)
# Note: Works if user is in gpio/dialout group or if passwordless sudo is configured
sudo python3 payment_gpio_mqtt.py
