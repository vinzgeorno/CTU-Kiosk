#!/usr/bin/env python3
"""
Servo Test Script for CTU-Kiosk Change Dispenser
Tests servo functionality independently
"""

import RPi.GPIO as GPIO
import time
import sys

# ── Servo config (Change Dispenser) ────────────────────────────────
SERVO_PIN = 17  # PWM-capable GPIO pin for servo control (can also use GPIO 18)
SERVO_REST_ANGLE = 0       # Rest position (no dispensing)
SERVO_PUSH_ANGLE = 100      # Push position (dispenses coin)
SERVO_MOVE_DELAY = 0.2     # 300ms for servo movement
SERVO_DWELL_TIME = 0.5     # 500ms to let coin drop before returning
SERVO_COIN_GAP = 0.75       # 500ms gap between coins
SERVO_PWM_FREQ = 50        # PWM frequency for servo (50 Hz standard)

# ── Global state ───────────────────────────────────────────────────
servo_pwm = None
servo_initialized = False


# ── Servo Control Functions ────────────────────────────────────────

def angle_to_pwm(angle):
    """Convert servo angle (0-180) to PWM duty cycle (2-12%)"""
    # Standard servo: 1ms pulse = 0°, 1.5ms pulse = 90°, 2ms pulse = 180°
    # PWM: 2-12% duty at 50Hz = 1-2ms pulse width
    duty_cycle = 2.0 + (angle / 180.0) * 10.0
    return duty_cycle


def set_servo_angle(angle):
    """Set servo to specified angle (0-180)"""
    global servo_pwm
    if servo_pwm is None:
        print("⚠️  Servo not initialized")
        return
    
    duty = angle_to_pwm(angle)
    try:
        servo_pwm.ChangeDutyCycle(duty)
        time.sleep(0.05)  # Small delay for PWM update to take effect
        print(f"🔧 Servo angle set to {angle}° (PWM duty: {duty:.1f}%)")
    except Exception as e:
        print(f"❌ Error setting servo angle: {e}")


def initialize_servo():
    """Initialize servo GPIO - called only when dispense is needed"""
    global servo_pwm, servo_initialized
    
    if servo_initialized:
        print("ℹ️  Servo already initialized, skipping...")
        return True
    
    try:
        print("\n🔧 [SERVO] Initializing on-demand for dispense operation...")
        
        # Setup GPIO for servo
        try:
            GPIO.setup(SERVO_PIN, GPIO.OUT, initial=GPIO.LOW)
        except RuntimeError:
            # Already configured
            pass
        
        time.sleep(0.2)
        
        # Initialize PWM directly at REST position (no unnecessary movement!)
        time.sleep(0.5)  # Extra stabilization before PWM creation
        servo_pwm = GPIO.PWM(SERVO_PIN, SERVO_PWM_FREQ)
        rest_duty = angle_to_pwm(SERVO_REST_ANGLE)
        servo_pwm.ChangeDutyCycle(rest_duty)  # Set duty before starting
        servo_pwm.start(rest_duty)  # Start directly at rest, no intermediate steps
        time.sleep(0.5)  # Extra stabilization after PWM starts
        
        servo_initialized = True
        print(f"✅ [SERVO] Initialized at rest position on GPIO {SERVO_PIN}\n")
        return True
        
    except Exception as e:
        print(f"❌ [SERVO] Initialization failed: {e}\n")
        return False


def cleanup_servo():
    """Clean up servo GPIO - called after dispense is complete"""
    global servo_pwm, servo_initialized
    
    try:
        if servo_pwm is not None:
            servo_pwm.stop()
            servo_pwm = None
        servo_initialized = False
        print("✅ [SERVO] Cleaned up and released GPIO\n")
    except Exception as e:
        print(f"⚠️  [SERVO] Cleanup error: {e}\n")


def push_coin():
    """Dispense a single coin"""
    global servo_pwm
    if servo_pwm is None:
        print("⚠️  Servo not initialized, skipping coin dispense")
        return
    
    # Push
    print(f"    → Pushing to {SERVO_PUSH_ANGLE}°")
    set_servo_angle(SERVO_PUSH_ANGLE)
    time.sleep(SERVO_MOVE_DELAY)
    
    # Dwell - let coin drop before returning
    print(f"    → Dwelling for {SERVO_DWELL_TIME}s (coin drops)")
    time.sleep(SERVO_DWELL_TIME)
    
    # Return to rest
    print(f"    → Returning to {SERVO_REST_ANGLE}°")
    set_servo_angle(SERVO_REST_ANGLE)
    time.sleep(SERVO_MOVE_DELAY)
    
    print("💰 Coin dispensed")


def dispense_coins(num_coins):
    """Dispense specified number of 5PHP coins"""
    if num_coins <= 0:
        print("⚠️  Invalid coin count")
        return False
    
    change_amount = num_coins * 5  # Each coin is ₱5
    print(f"\n🎯 === AUTO-DISPENSE: {num_coins} × ₱5 coins (Total: ₱{change_amount}) ===")
    print(f"📋 Plan: Initialize servo → Loop {num_coins} times → Each push_coin() does 1 push")
    
    try:
        # Initialize servo only when needed
        if not initialize_servo():
            print("❌ Failed to initialize servo")
            return False
        
        print(f"🔄 Starting dispense loop with {num_coins} iterations...")
        
        for i in range(num_coins):
            print(f"[{i+1}/{num_coins}] Dispensing ₱5 coin...")
            push_coin()
            if i < num_coins - 1:
                time.sleep(SERVO_COIN_GAP)
        
        print(f"✅ Successfully dispensed ₱{change_amount} as change")
        
        # Clean up servo after dispensing
        cleanup_servo()
        return True
        
    except Exception as e:
        print(f"❌ Dispense failed: {e}")
        cleanup_servo()
        return False


# ── Interactive Test Menu ──────────────────────────────────────────

def test_menu():
    """Interactive servo test menu"""
    print("\n" + "="*60)
    print("🔧 CTU-Kiosk Servo Test Menu")
    print("="*60)
    print("1. Initialize Servo")
    print("2. Set Angle (0-180°)")
    print("3. Push Coin (Single)")
    print("4. Dispense Multiple Coins")
    print("5. Test Full Cycle")
    print("6. Cleanup & Exit")
    print("="*60)


def main():
    print("\n" + "="*60)
    print("🚀 CTU-Kiosk Servo Test Starting...")
    print("="*60)
    print(f"🔧 Servo: GPIO {SERVO_PIN}")
    print(f"📐 Rest Angle: {SERVO_REST_ANGLE}°")
    print(f"📐 Push Angle: {SERVO_PUSH_ANGLE}°\n")
    
    # Setup GPIO
    try:
        GPIO.setmode(GPIO.BCM)
        print("✅ GPIO mode set to BCM\n")
    except Exception as e:
        print(f"❌ GPIO setup failed: {e}")
        return
    
    while True:
        test_menu()
        choice = input("Select option (1-6): ").strip()
        
        if choice == "1":
            print("\n→ Initializing servo...")
            initialize_servo()
        
        elif choice == "2":
            try:
                angle = int(input("Enter angle (0-180): "))
                if 0 <= angle <= 180:
                    if not servo_initialized:
                        initialize_servo()
                    set_servo_angle(angle)
                else:
                    print("❌ Angle must be between 0-180")
            except ValueError:
                print("❌ Invalid input")
        
        elif choice == "3":
            print("\n→ Single coin push...")
            if not servo_initialized:
                initialize_servo()
            push_coin()
        
        elif choice == "4":
            try:
                num = int(input("Number of coins to dispense: "))
                dispense_coins(num)
            except ValueError:
                print("❌ Invalid input")
        
        elif choice == "5":
            print("\n→ Running full cycle test...")
            dispense_coins(3)  # Test with 3 coins
        
        elif choice == "6":
            print("\n→ Cleaning up...")
            cleanup_servo()
            try:
                GPIO.cleanup()
                print("✅ GPIO cleanup complete")
            except:
                pass
            print("\n✅ Servo test completed")
            break
        
        else:
            print("❌ Invalid option")
        
        input("\nPress Enter to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n🛑 Interrupted by user")
        cleanup_servo()
        try:
            GPIO.cleanup()
        except:
            pass
    except Exception as e:
        print(f"\n❌ Error: {e}")
        cleanup_servo()
        try:
            GPIO.cleanup()
        except:
            pass
