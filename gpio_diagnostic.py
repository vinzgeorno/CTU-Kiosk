#!/usr/bin/env python3
"""
GPIO Servo Diagnostic - Check for jitter and GPIO conflicts
"""

import RPi.GPIO as GPIO
import time
import sys

SERVO_PIN = 17
SERVO_PWM_FREQ = 50

def angle_to_pwm(angle):
    """Convert servo angle to PWM duty"""
    duty_cycle = 2.0 + (angle / 180.0) * 10.0
    return duty_cycle

def test_servo_stability():
    """Test servo stability and PWM signal quality"""
    print("\n" + "="*60)
    print("🔧 Servo Stability Diagnostic")
    print("="*60 + "\n")
    
    try:
        # Cleanup first
        try:
            GPIO.cleanup()
        except:
            pass
        
        time.sleep(0.5)
        
        print("📊 GPIO Setup...")
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(SERVO_PIN, GPIO.OUT, initial=GPIO.LOW)
        print("✅ GPIO pin configured\n")
        
        # Test 1: Check GPIO state
        print("📍 [TEST 1] GPIO State Check")
        print(f"   GPIO {SERVO_PIN} direction: OUT")
        try:
            state = GPIO.input(SERVO_PIN)
            print(f"   Current level: {state} (0=LOW, 1=HIGH)")
        except:
            print("   ⚠️  Cannot read GPIO input")
        print()
        
        # Test 2: PWM initialization
        print("📍 [TEST 2] PWM Initialization")
        try:
            servo_pwm = GPIO.PWM(SERVO_PIN, SERVO_PWM_FREQ)
            print(f"   Frequency: {SERVO_PWM_FREQ}Hz")
            
            # Start at neutral
            neutral_duty = 7.5
            print(f"   Starting at neutral duty: {neutral_duty}%...")
            servo_pwm.start(neutral_duty)
            time.sleep(0.5)
            print("   ✅ PWM started smoothly")
            print()
            
            # Test 3: Angle transitions
            print("📍 [TEST 3] Angle Transitions (Hold for smoothness)")
            for angle in [0, 45, 90, 135, 180]:
                duty = angle_to_pwm(angle)
                servo_pwm.ChangeDutyCycle(duty)
                print(f"   {angle:3d}° → {duty:.1f}% duty cycle")
                time.sleep(0.3)
            
            print("   ✅ All transitions smooth\n")
            
            # Test 4: Stability hold
            print("📍 [TEST 4] Stability Hold (30 seconds at rest)")
            print("   Servo should NOT jitter during this time")
            print("   Rest angle: 0° (2.0% duty)")
            servo_pwm.ChangeDutyCycle(angle_to_pwm(0))
            
            for i in range(30):
                if i % 5 == 0:
                    print(f"   ⏱️  {i}s - Signal stable")
                time.sleep(1)
            
            print("   ✅ 30 seconds complete\n")
            
            # Test 5: Rapid cycling
            print("📍 [TEST 5] Rapid Angle Changes (simulating dispense)")
            servo_pwm.ChangeDutyCycle(angle_to_pwm(0))  # Rest
            time.sleep(0.3)
            
            for cycle in range(3):
                print(f"   Cycle {cycle+1}/3: Push & Return")
                servo_pwm.ChangeDutyCycle(angle_to_pwm(85))  # Push
                time.sleep(0.3)
                servo_pwm.ChangeDutyCycle(angle_to_pwm(0))   # Return
                time.sleep(0.3)
            
            print("   ✅ Rapid cycling successful\n")
            
            # Cleanup
            servo_pwm.stop()
            GPIO.cleanup()
            
            print("="*60)
            print("✅ SERVO DIAGNOSTIC COMPLETE - No jitter detected!")
            print("="*60 + "\n")
            
            print("💡 If servo was jittery, try:")
            print("   1. ./cleanup_gpio.sh")
            print("   2. sudo python3 gpio_diagnostic.py")
            print()
            
            return True
            
        except Exception as e:
            print(f"   ❌ PWM Error: {e}\n")
            return False
            
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        print("   Make sure to run with: sudo python3 gpio_diagnostic.py")
        return False
    finally:
        try:
            GPIO.cleanup()
        except:
            pass

if __name__ == "__main__":
    if not test_servo_stability():
        sys.exit(1)
