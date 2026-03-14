#!/usr/bin/env python3
"""
POS58 Printer Debug Script
Tries progressively more complex print methods to isolate the issue.
Run each test and check if anything printed.
"""

import sys
import os
import subprocess
import time

def find_device():
    candidates = ["/dev/usb/lp0", "/dev/usb/lp1", "/dev/lp0", "/dev/lp1",
                  "/dev/ttyUSB0", "/dev/ttyUSB1", "/dev/ttyACM0", "/dev/ttyACM1"]
    for p in candidates:
        if os.path.exists(p):
            return p
    return None

device = sys.argv[1] if len(sys.argv) > 1 else find_device()

if not device:
    print("No printer device found. Pass path as argument: python3 printer_debug.py /dev/usb/lp0")
    sys.exit(1)

print(f"Using device: {device}")
print(f"Device exists: {os.path.exists(device)}")
print(f"Device readable: {os.access(device, os.R_OK)}")
print(f"Device writable: {os.access(device, os.W_OK)}")
print()

# ─── TEST 1: Absolute bare minimum ────────────────────────────────────────────
print("=" * 50)
print("TEST 1: Raw ASCII text only, zero ESC/POS commands")
print("=" * 50)
try:
    with open(device, "wb") as f:
        f.write(b"HELLO WORLD\n\n\n\n\n")
        f.flush()
    print("✓ Wrote raw text. Did 'HELLO WORLD' print?\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")

time.sleep(2)

# ─── TEST 2: Init then text ────────────────────────────────────────────────────
print("=" * 50)
print("TEST 2: ESC @ (init) then text")
print("=" * 50)
try:
    with open(device, "wb") as f:
        f.write(b'\x1b\x40')           # ESC @ — initialize
        f.write(b'TEST 2 AFTER INIT\n\n\n\n\n')
        f.flush()
    print("✓ Wrote init + text. Did 'TEST 2 AFTER INIT' print?\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")

time.sleep(2)

# ─── TEST 3: lp command (bypass Python file I/O entirely) ─────────────────────
print("=" * 50)
print("TEST 3: Using 'lp' command (CUPS)")
print("=" * 50)
try:
    result = subprocess.run(
        ["lp", "-d", "raw", "-o", "raw"],
        input=b"TEST 3 VIA LP COMMAND\n\n\n\n\n",
        capture_output=True, timeout=5
    )
    print(f"lp stdout: {result.stdout}")
    print(f"lp stderr: {result.stderr}")
    print("✓ lp command ran. Did 'TEST 3 VIA LP COMMAND' print?\n")
except FileNotFoundError:
    print("lp command not found (CUPS not installed)\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")

time.sleep(2)

# ─── TEST 4: Direct device write via shell (bypasses Python entirely) ──────────
print("=" * 50)
print("TEST 4: echo via shell redirect to device")
print("=" * 50)
try:
    result = subprocess.run(
        f'echo "TEST 4 SHELL ECHO" > {device}',
        shell=True, capture_output=True, text=True, timeout=5
    )
    print(f"Return code: {result.returncode}")
    if result.stderr:
        print(f"stderr: {result.stderr}")
    print("✓ Shell echo ran. Did 'TEST 4 SHELL ECHO' print?\n")
except Exception as e:
    print(f"✗ Failed: {e}\n")

time.sleep(2)

# ─── TEST 5: Check if device is a serial port and needs baud rate set ──────────
print("=" * 50)
print("TEST 5: stty check (if device is /dev/ttyUSB* or /dev/ttyACM*)")
print("=" * 50)
if "tty" in device:
    try:
        result = subprocess.run(["stty", "-F", device], capture_output=True, text=True)
        print(f"Current stty settings: {result.stdout.strip()}")
        # Set to 9600 baud 8N1 (common for POS58)
        subprocess.run(["stty", "-F", device, "9600", "cs8", "-cstopb", "-parenb", "raw"], check=True)
        print("Set baud to 9600 8N1 raw")
        with open(device, "wb") as f:
            f.write(b'\x1b\x40')
            f.write(b'TEST 5 SERIAL 9600\n\n\n\n\n')
            f.flush()
        print("✓ Wrote at 9600 baud. Did 'TEST 5 SERIAL 9600' print?\n")
    except Exception as e:
        print(f"✗ Serial test failed: {e}\n")
else:
    print(f"Skipped — {device} is not a tty device\n")

# ─── TEST 6: dmesg check ───────────────────────────────────────────────────────
print("=" * 50)
print("TEST 6: dmesg — last 15 lines (shows USB/printer kernel messages)")
print("=" * 50)
try:
    result = subprocess.run(["dmesg", "--time-format=reltime"], 
                            capture_output=True, text=True, timeout=5)
    lines = result.stdout.strip().splitlines()
    for line in lines[-15:]:
        print(f"  {line}")
except Exception as e:
    print(f"Could not run dmesg: {e}")

print()
print("─" * 50)
print("DONE. Report which tests printed and which didn't.")
print("─" * 50)