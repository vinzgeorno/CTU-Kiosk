#!/usr/bin/env python3
"""
ESC/POS Thermal Printer Connection Test Script
Tests USB and Network printer connectivity
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def load_env():
    """Load environment variables from .env file"""
    env_file = project_root / '.env'
    env_vars = {}
    
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    if '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key.strip()] = value.strip()
    
    return env_vars

def test_usb_printer():
    """Test USB thermal printer connection"""
    print("\n" + "="*60)
    print("🔌 Testing USB Thermal Printer Connection")
    print("="*60)
    
    env_vars = load_env()
    
    try:
        vid = int(env_vars.get('PRINTER_USB_VID', '0x04b8'), 16)
        pid = int(env_vars.get('PRINTER_USB_PID', '0x0202'), 16)
    except ValueError:
        print("❌ Invalid VID/PID in .env file")
        return False
    
    print(f"📍 Configured printer: VID={hex(vid)}, PID={hex(pid)}")
    
    try:
        from escpos.printer import Usb
        print("📌 Attempting USB connection...")
        
        printer = Usb(vid, pid)
        
        print("✅ USB Printer Connected!")
        print("🖨️  Printing test ticket...\n")
        
        # Print test ticket using correct escpos API
        printer.text('ESC/POS TEST\n')
        printer.text('USB Printer Connected\n\n')
        printer.text('Date: ' + __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\n\n')
        printer.text('QR Code Test\n\n')
        printer.text('='*40 + '\n')
        # Paper cut
        try:
            printer.cut()
        except:
            pass  # Some printers don't support cut
        
        print("✅ Test print sent successfully!")
        printer.close()
        
        return True
        
    except FileNotFoundError:
        print("❌ USB Printer not found!")
        print("   - Check that printer is powered on")
        print("   - Check USB cable connection")
        print("   - Run: lsusb | grep -i printer")
        return False
    except Exception as e:
        print(f"❌ USB Connection Error: {e}")
        print("\nPossible solutions:")
        print("1. Verify USB Vendor ID (VID) and Product ID (PID)")
        print("2. Check USB permissions: usermod -aG lp $USER")
        print("3. List USB devices: lsusb")
        print("4. Check kernel messages: dmesg | tail -20")
        return False

def test_network_printer():
    """Test Network thermal printer connection"""
    print("\n" + "="*60)
    print("🌐 Testing Network Thermal Printer Connection")
    print("="*60)
    
    env_vars = load_env()
    
    printer_ip = env_vars.get('PRINTER_IP', '192.168.1.100')
    printer_port = int(env_vars.get('PRINTER_PORT', '9100'))
    
    print(f"📍 Configured printer: {printer_ip}:{printer_port}")
    
    try:
        # First test connectivity
        import socket
        print(f"🔍 Testing network connectivity to {printer_ip}:{printer_port}...")
        
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((printer_ip, printer_port))
        sock.close()
        
        if result != 0:
            print(f"❌ Cannot connect to {printer_ip}:{printer_port}")
            print("   Possible solutions:")
            print("   - Verify printer IP address")
            print("   - Check printer is on same network")
            print("   - Ping printer: ping " + printer_ip)
            print("   - Scan network: nmap -p 9100 192.168.1.0/24")
            return False
        
        print(f"✅ Network connection successful!")
        print("🖨️  Attempting print...")
        
        from escpos.printer import Network
        printer = Network(printer_ip, port=printer_port)
        
        # Print test ticket using correct escpos API
        printer.text('ESC/POS TEST\n')
        printer.text('Network Printer Connected\n\n')
        printer.text('IP: ' + printer_ip + '\n')
        printer.text('Date: ' + __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S') + '\n\n')
        printer.text('✅ Network Connection OK\n\n')
        printer.text('='*40 + '\n')
        
        try:
            printer.cut()
        except:
            pass  # Some printers don't support cut
        
        print("✅ Test print sent successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Network Connection Error: {e}")
        return False

def list_usb_devices():
    """List connected USB devices"""
    print("\n" + "="*60)
    print("📋 Connected USB Devices")
    print("="*60)
    
    try:
        import subprocess
        result = subprocess.run(['lsusb'], capture_output=True, text=True, timeout=5)
        print(result.stdout)
        
        # Highlight potential printers
        print("\n🔎 Searching for thermal printers...")
        result = subprocess.run(['lsusb', '|', 'grep', '-iE', 'printer|thermal|epson|zebra|receipt'], 
                              shell=True, capture_output=True, text=True, timeout=5)
        if result.stdout:
            print("Found:\n" + result.stdout)
        else:
            print("No known thermal printers detected")
            
    except Exception as e:
        print(f"Error listing USB devices: {e}")

def main():
    """Main test function"""
    print("\n" + "="*60)
    print("🖨️  CTU-Kiosk ESC/POS Printer Setup Test")
    print("="*60)
    
    # Show current configuration
    env_vars = load_env()
    print("\n📝 Current Configuration (.env):")
    print(f"   USB VID:  {env_vars.get('PRINTER_USB_VID', 'Not set')}")
    print(f"   USB PID:  {env_vars.get('PRINTER_USB_PID', 'Not set')}")
    print(f"   Network:  {env_vars.get('PRINTER_IP', 'Not set')}:{env_vars.get('PRINTER_PORT', 'Not set')}")
    
    # List USB devices
    list_usb_devices()
    
    # Test USB printer
    usb_success = test_usb_printer()
    
    # Test Network printer
    network_success = test_network_printer()
    
    # Summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    print(f"USB Printer:     {'✅ Connected' if usb_success else '❌ Not connected'}")
    print(f"Network Printer: {'✅ Connected' if network_success else '❌ Not connected'}")
    
    if not (usb_success or network_success):
        print("\n⚠️  No printer connected!")
        print("\nNext Steps:")
        print("1. Connect thermal printer via USB or network")
        print("2. Verify printer model and get VID:PID from 'lsusb'")
        print("3. Update .env file with correct values")
        print("4. Run this script again")
        print("\nCommon Printer IDs:")
        print("   Epson TM-T88: VID=0x04b8, PID=0x0202")
        print("   Epson TM-T90: VID=0x04b8, PID=0x0203")
        print("   Zebra LP2844: VID=0x0b01, PID=0x006b")
        sys.exit(1)
    else:
        print("\n✅ Printer is ready for use!")
        print("Run: npm start (to start the kiosk backend)")
        sys.exit(0)

if __name__ == '__main__':
    main()
