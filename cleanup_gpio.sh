#!/bin/bash
# cleanup_gpio.sh - Force GPIO cleanup before starting kiosk
# Run this if servo is jittery or GPIO is stuck

echo "🔧 Performing GPIO cleanup..."

# Kill any existing Python GPIO processes
echo "  ⚠️  Stopping any running GPIO processes..."
pkill -f "payment_gpio_mqtt.py" 2>/dev/null || true
pkill -f "test_servo.py" 2>/dev/null || true
sleep 1

# Reset GPIO using gpio utility (if available)
if command -v gpio &> /dev/null; then
    echo "  🔄 Resetting GPIO via gpio utility..."
    sudo gpio reset 2>/dev/null || true
    sleep 1
fi

# Python GPIO cleanup
echo "  🐍 Cleaning GPIO via Python..."
sudo python3 << 'EOF'
import RPi.GPIO as GPIO
import time
try:
    GPIO.setmode(GPIO.BCM)
    GPIO.cleanup()
    print("  ✅ GPIO cleaned up")
except Exception as e:
    print(f"  ⚠️  GPIO cleanup warning: {e}")
finally:
    try:
        GPIO.cleanup()
    except:
        pass
time.sleep(0.5)
EOF

# Check if servo pins are available
echo "  🔍 Checking GPIO 17 (servo)..."
if [ -e "/sys/class/gpio/gpio17" ]; then
    echo "  📍 GPIO 17 exists, cleaning up..."
    echo 17 | sudo tee /sys/class/gpio/unexport > /dev/null 2>&1 || true
    sleep 0.5
fi

echo "✅ GPIO cleanup complete!"
echo ""
echo "💡 Now you can run: ./start_kiosk.sh"
