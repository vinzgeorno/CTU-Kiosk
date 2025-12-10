import RPi.GPIO as GPIO
import time

COIN_PIN = 2  # BCM number (physical pin 3)

# Map pulses per coin to credit value
# Example: 1 pulse = 1, 2 pulses = 5, 5 pulses = 10, etc.
PULSE_TO_VALUE = {
    1: 1,   # e.g. 1-pulse coin worth 1 unit
    2: 5,   # example mapping
    5: 10   # example mapping
}

pulse_count = 0
last_pulse_time = 0

# How long (seconds) without pulses before we say "that's one coin"
COIN_GAP_TIMEOUT = 0.15  # 150 ms; adjust to your acceptor speed

def coin_pulse_callback(channel):
    global pulse_count, last_pulse_time
    now = time.time()

    # Simple debounce: ignore pulses too close together (<5ms)
    if now - last_pulse_time < 0.005:
        return

    pulse_count += 1
    last_pulse_time = now
    print(f"Pulse! current burst pulses: {pulse_count}")

def main():
    global pulse_count, last_pulse_time

    GPIO.setmode(GPIO.BCM)
    GPIO.setup(COIN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
    GPIO.add_event_detect(COIN_PIN, GPIO.FALLING,
                          callback=coin_pulse_callback,
                          bouncetime=5)

    total_credit = 0
    print("Coin acceptor (grouped) ready. Press CTRL+C to stop.")

    try:
        while True:
            now = time.time()

            # If we have pulses and enough time has passed since the last pulse,
            # treat that burst as one coin
            if pulse_count > 0 and (now - last_pulse_time) > COIN_GAP_TIMEOUT:
                pulses = pulse_count
                pulse_count = 0

                value = PULSE_TO_VALUE.get(pulses, None)
                if value is None:
                    print(f"Unknown coin: {pulses} pulses")
                else:
                    total_credit += value
                    print(f"Coin detected: {pulses} pulses -> +{value} credit. Total: {total_credit}")

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("Stopping...")
    finally:
        GPIO.cleanup()

if __name__ == "__main__":
    main()
