#!/usr/bin/env python3
"""
Combined Coin & Bill Acceptor Script for Raspberry Pi
- Coin Acceptor: GPIO 2 (physical pin 3)
- Bill Acceptor: GPIO 22 (physical pin 15)
"""

import RPi.GPIO as GPIO
import time

# ── Pin assignments ───────────────────────────────────────────────
COIN_PIN = 2
BILL_PIN = 22

# ── Shared state ──────────────────────────────────────────────────
credit = 0  # total credit in pesos

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


# ── Callbacks ─────────────────────────────────────────────────────
def coin_pulse_callback(channel):
    global coin_pulse_count, coin_last_pulse_time
    now = time.time()
    if (now - coin_last_pulse_time) > (COIN_DEBOUNCE_MS / 1000.0):
        coin_pulse_count += 1
        coin_last_pulse_time = now
        print(f"[COIN] Pulse! count = {coin_pulse_count}")


def bill_pulse_callback(channel):
    global bill_pulse_count, bill_last_pulse_time
    now = time.time()
    if (now - bill_last_pulse_time) > (BILL_DEBOUNCE_MS / 1000.0):
        bill_pulse_count += 1
        bill_last_pulse_time = now
        # print(f"[BILL] Pulse! count = {bill_pulse_count}")  # uncomment to debug


# ── Main ──────────────────────────────────────────────────────────
def main():
    global coin_pulse_count, bill_pulse_count, credit
    global coin_last_pulse_time, bill_last_pulse_time

    GPIO.setmode(GPIO.BCM)

    # Setup both pins with pull-up; idle HIGH, pulses pull LOW
    GPIO.setup(COIN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.setup(BILL_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)

    GPIO.add_event_detect(COIN_PIN, GPIO.FALLING,
                          callback=coin_pulse_callback,
                          bouncetime=COIN_DEBOUNCE_MS)
    GPIO.add_event_detect(BILL_PIN, GPIO.FALLING,
                          callback=bill_pulse_callback,
                          bouncetime=BILL_DEBOUNCE_MS)

    print("Coin & Bill Acceptor Ready... (Press CTRL+C to exit)")
    print(f"  Coin → GPIO {COIN_PIN} | Bill → GPIO {BILL_PIN}")
    print(f"  Coin pulse map: {PULSE_TO_VALUE}")
    print(f"  Bill: ₱{BILL_VALUE_PER_PULSE} per pulse\n")

    try:
        last_debug_time = time.time()

        while True:
            now = time.time()

            # ── Process coin burst ────────────────────────────────
            if coin_pulse_count > 0 and (now - coin_last_pulse_time) > COIN_GAP_TIMEOUT:
                pulses = coin_pulse_count
                coin_pulse_count = 0

                value = PULSE_TO_VALUE.get(pulses)
                if value is None:
                    print(f"[COIN] Unknown coin: {pulses} pulses")
                else:
                    credit += value
                    print(f"[COIN] ✓ {pulses} pulses → ₱{value} added | Total: ₱{credit}")

            # ── Process bill burst ────────────────────────────────
            if bill_pulse_count > 0 and (now - bill_last_pulse_time) > BILL_DONE_TIMEOUT:
                pulses = bill_pulse_count
                bill_pulse_count = 0

                added = pulses * BILL_VALUE_PER_PULSE
                credit += added
                print(f"[BILL] ✓ {pulses} pulses → ₱{added} added | Total: ₱{credit}")

            # ── Debug every 2s ────────────────────────────────────
            if now - last_debug_time > 2.0:
                coin_state = GPIO.input(COIN_PIN)
                bill_state = GPIO.input(BILL_PIN)
                print(f"[DEBUG] COIN GPIO{COIN_PIN}={coin_state} (pulses={coin_pulse_count}) | "
                      f"BILL GPIO{BILL_PIN}={bill_state} (pulses={bill_pulse_count}) | "
                      f"Credit=₱{credit}", flush=True)
                last_debug_time = now

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("\nStopping...")
    finally:
        GPIO.cleanup()


if __name__ == "__main__":
    main()