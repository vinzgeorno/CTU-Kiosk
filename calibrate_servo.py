#!/usr/bin/env python3
"""
Servo Angle Calibration Tool
Helps find the optimal push angle for single-coin dispensing
"""

import RPi.GPIO as GPIO
import time
import sys

SERVO_PIN = 17
SERVO_REST_ANGLE = 0
SERVO_PWM_FREQ = 50
servo_pwm = None

def angle_to_pwm(angle):
    """Convert servo angle to PWM duty"""
    duty_cycle = 2.0 + (angle / 180.0) * 10.0
    return duty_cycle

def set_servo_angle(angle):
    """Set servo to specified angle"""
    global servo_pwm
    if servo_pwm is None:
        return False
    
    try:
        duty = angle_to_pwm(angle)
        servo_pwm.ChangeDutyCycle(duty)
        time.sleep(0.05)
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def initialize_servo():
    """Setup servo"""
    global servo_pwm
    
    try:
        try:
            GPIO.cleanup()
        except:
            pass
        
        time.sleep(0.3)
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(SERVO_PIN, GPIO.OUT, initial=GPIO.LOW)
        time.sleep(0.2)
        
        servo_pwm = GPIO.PWM(SERVO_PIN, SERVO_PWM_FREQ)
        rest_duty = angle_to_pwm(SERVO_REST_ANGLE)
        servo_pwm.start(rest_duty)  # Start directly at rest (no movement!)
        time.sleep(0.3)
        
        print("✅ Servo initialized\n")
        return True
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        return False

def cleanup():
    """Cleanup GPIO"""
    try:
        if servo_pwm is not None:
            servo_pwm.stop()
        GPIO.cleanup()
    except:
        pass

def test_angle(angle, duration=0.3):
    """Test a specific angle"""
    print(f"Testing angle: {angle}°")
    print(f"  → Pushing (duty: {angle_to_pwm(angle):.1f}%)...")
    set_servo_angle(angle)
    time.sleep(duration)
    
    print(f"  → Holding for coin drop (500ms dwell)...")
    time.sleep(0.5)  # Dwell time for coin to drop
    
    print(f"  → Returning to rest...")
    set_servo_angle(SERVO_REST_ANGLE)
    time.sleep(duration)
    print(f"✓ Test complete\n")

def main():
    print("\n" + "="*60)
    print("🔧 SERVO ANGLE CALIBRATION TOOL")
    print("="*60)
    print("\nGoal: Find the angle that dispenses exactly 1 coin\n")
    print("Current settings:")
    print(f"  Rest angle: {SERVO_REST_ANGLE}°")
    print(f"  Current push angle: 85°")
    print(f"  Move delay: 300ms\n")
    
    if not initialize_servo():
        sys.exit(1)
    
    print("="*60)
    print("CALIBRATION MENU")
    print("="*60)
    print("\nOptions:")
    print("  1 - Test current angle (85°)")
    print("  2 - Test lower angle (75°)")
    print("  3 - Test lower angle (70°)")
    print("  4 - Test lower angle (65°)")
    print("  5 - Test lower angle (60°)")
    print("  6 - Test higher angle (90°)")
    print("  7 - Test higher angle (95°)")
    print("  8 - Test custom angle")
    print("  9 - Test multiple coins with best angle")
    print("  0 - Exit\n")
    
    best_angle = 85
    
    try:
        while True:
            choice = input("Select option (0-9): ").strip()
            
            if choice == "0":
                print("\n✅ Calibration complete!")
                if best_angle != 85:
                    print(f"\n💡 Recommended angle: {best_angle}°")
                    print(f"\nUpdate payment_gpio_mqtt.py:")
                    print(f"  SERVO_PUSH_ANGLE = {best_angle}")
                break
            
            elif choice == "1":
                print("\n📍 Testing current angle 85°")
                print("⚠️  You mentioned this dispenses 2 coins!")
                test_angle(85)
            
            elif choice == "2":
                print("\n📍 Testing lower angle 75°")
                test_angle(75)
                response = input("Did this dispense 1 coin? (y/n): ").strip().lower()
                if response == 'y':
                    best_angle = 75
                    print("✅ 75° is better! Keep testing lower.\n")
            
            elif choice == "3":
                print("\n📍 Testing lower angle 70°")
                test_angle(70)
                response = input("Did this dispense 1 coin? (y/n): ").strip().lower()
                if response == 'y':
                    best_angle = 70
                    print("✅ 70° works! Still too high?\n")
            
            elif choice == "4":
                print("\n📍 Testing lower angle 65°")
                test_angle(65)
                response = input("Did this dispense 1 coin? (y/n): ").strip().lower()
                if response == 'y':
                    best_angle = 65
                    print("✅ 65° works! Even lower?\n")
            
            elif choice == "5":
                print("\n📍 Testing lower angle 60°")
                test_angle(60)
                response = input("Did this dispense 1 coin? (y/n): ").strip().lower()
                if response == 'y':
                    best_angle = 60
                    print("✅ 60° works! Try even lower?\n")
            
            elif choice == "6":
                print("\n📍 Testing higher angle 90°")
                test_angle(90)
                print("⚠️  This will likely dispense even MORE coins!\n")
            
            elif choice == "7":
                print("\n📍 Testing higher angle 95°")
                test_angle(95)
                print("⚠️  This will likely dispense even MORE coins!\n")
            
            elif choice == "8":
                try:
                    angle = int(input("Enter angle (0-180): ").strip())
                    if 0 <= angle <= 180:
                        print(f"\n📍 Testing custom angle {angle}°")
                        test_angle(angle)
                        response = input("Did this dispense 1 coin? (y/n): ").strip().lower()
                        if response == 'y':
                            best_angle = angle
                            print(f"✅ {angle}° works!\n")
                    else:
                        print("❌ Angle must be 0-180\n")
                except ValueError:
                    print("❌ Invalid input\n")
            
            elif choice == "9":
                num = int(input(f"Test how many coins with {best_angle}°? "))
                print(f"\n🎯 Testing {num} coins at {best_angle}°\n")
                for i in range(num):
                    print(f"[{i+1}/{num}] Push {best_angle}°...")
                    set_servo_angle(best_angle)
                    time.sleep(0.3)
                    print(f"     Holding for coin drop...")
                    time.sleep(0.5)  # Dwell time
                    set_servo_angle(SERVO_REST_ANGLE)
                    time.sleep(0.3)
                    if i < num - 1:
                        time.sleep(0.5)  # Gap
                print(f"\n✓ {num}-coin test complete\n")
            
            else:
                print("❌ Invalid option\n")
    
    except KeyboardInterrupt:
        print("\n\n🛑 Calibration interrupted")
    finally:
        cleanup()

if __name__ == "__main__":
    main()
