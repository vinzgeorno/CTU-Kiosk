# ESC/POS Thermal Printer Setup Guide

## Overview

The CTU-Kiosk system now uses **ESC/POS** (a standard thermal printer protocol) instead of CUPS for printing tickets. ESC/POS provides direct, faster communication with thermal printers and is the preferred method for POS systems.

## What is ESC/POS?

- **ESC/POS** = Escape Sequences for Point Of Sale
- Standard protocol for thermal receipt printers
- Direct communication (USB or Network) - no print queue needed
- Faster and more reliable than CUPS for embedded systems
- Supports text formatting, QR codes, images, and paper control

## Printer Connection Options

### Option 1: USB Connection (Recommended for Kiosk)

Best for: Desktop/embedded systems with USB ports

**Step 1: Identify Your Printer**

```bash
lsusb
```

Look for your thermal printer. Common vendors:
- Epson: `04b8:0202` (TM series)
- Zebra: `0b01:006b`
- Generic thermal: `1504:0006`

**Step 2: Get USB Vendor/Product IDs**

```bash
# Find your printer (it will show vid:pid)
lsusb | grep -i "thermal\|epson\|printer\|receipt"

# Example output:
# Bus 001 Device 003: ID 04b8:0202 Seiko Epson Corp. TM-T88 Receipt Printer
```

Record the IDs in the format: **VID:PID** (e.g., `04b8:0202`)

**Step 3: Set Environment Variables**

Add to your `.env` file or system environment:

```bash
# For USB printer
PRINTER_USB_VID=0x04b8      # Epson TM-T88 example
PRINTER_USB_PID=0x0202      # Adjust for your printer

# Optional: Network printer fallback
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

**Step 4: Grant USB Permissions (Linux)**

```bash
# Option A: Add user to lp group
sudo usermod -a -G lp $USER
sudo usermod -a -G dialout $USER
newgrp lp

# Option B: Create udev rule
sudo nano /etc/udev/rules.d/99-printer.rules

# Add this line:
SUBSYSTEMS=="usb", ATTRS{idVendor}=="04b8", ATTRS{idProduct}=="0202", MODE="0666"

# Reload udev
sudo udevadm control --reload
sudo udevadm trigger
```

**Step 5: Test USB Connection**

```bash
# Check if printer is accessible
python3 << 'EOF'
from escpos.printer import Usb
try:
    p = Usb(0x04b8, 0x0202)  # Replace with your VID, PID
    p.text("Test Print\n")
    p.cut()
    print("✅ USB Printer Connected Successfully")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
```

### Option 2: Network Connection (For Network Printers)

Best for: Networked thermal printers with IP addresses

**Step 1: Find Your Printer's IP Address**

```bash
# On the printer's control panel, print the network config page
# Or scan the network:
nmap -p 9100 192.168.1.0/24

# Common ESC/POS port is 9100
```

**Step 2: Set Environment Variables**

```bash
PRINTER_IP=192.168.1.100      # Your printer's IP
PRINTER_PORT=9100             # Standard ESC/POS port (usually 9100)
```

**Step 3: Test Network Connection**

```bash
# Test connectivity
nc -zv 192.168.1.100 9100

# If successful, output will be:
# Connection to 192.168.1.100 9100 port [tcp/*] succeeded!
```

**Step 4: Test Network Printer (Python)**

```bash
python3 << 'EOF'
from escpos.printer import Network
try:
    p = Network("192.168.1.100", port=9100)
    p.text("Test Print\n")
    p.cut()
    print("✅ Network Printer Connected Successfully")
except Exception as e:
    print(f"❌ Error: {e}")
EOF
```

## Common Thermal Printer Models & IDs

| Printer Model | Vendor ID | Product ID | Connection |
|---|---|---|---|
| Epson TM-T88 | `0x04b8` | `0x0202` | USB |
| Epson TM-T90 | `0x04b8` | `0x0203` | USB |
| Zebra LP2844-Z | `0x0b01` | `0x006b` | USB |
| Star Micronics | `0x0519` | `0x0003` | USB |
| Generic Thermal | `0x1504` | `0x0006` | USB |

## Backend Configuration

The application has automatic fallback logic:

1. **First**: Tries USB printer (using configured VID/PID)
2. **Second**: Falls back to network printer (if USB fails)
3. **Error**: Returns user-friendly error if both fail

### Environment Variables

```bash
# USB Configuration
PRINTER_USB_VID=0x04b8        # USB Vendor ID (hex)
PRINTER_USB_PID=0x0202        # USB Product ID (hex)

# Network Configuration (fallback)
PRINTER_IP=localhost          # Printer IP address
PRINTER_PORT=9100             # ESC/POS standard port
```

## Printer Setup on Raspberry Pi

If running on Raspberry Pi:

### Install Required Packages

```bash
sudo apt-get update
sudo apt-get install -y python3-usb python3-pip libusb-1.0-0 libusb-1.0-0-dev

# Install Node.js escpos package
npm install escpos
```

### Check Raspberry Pi USB Permissions

```bash
# List USB devices
lsusb

# Check if your printer appears
# If not, reseat the USB cable or use a powered USB hub
```

### Example .env File for RPi

```bash
# Raspberry Pi running CTU-Kiosk

# USB Thermal Printer (Epson TM-T88)
PRINTER_USB_VID=0x04b8
PRINTER_USB_PID=0x0202

# Or Network Printer
PRINTER_IP=192.168.1.50
PRINTER_PORT=9100

# Other settings
MQTT_BROKER=mqtt://localhost:1883
NODE_ENV=production
```

## Troubleshooting

### "Printer not detected" Error

```bash
# 1. Check USB connection
lsusb | grep -i printer

# 2. Check USB permissions
ls -la /dev/usb*
groups $USER

# 3. Try with sudo (permission issue)
sudo npm start

# 4. Check if device is properly powered
# Some printers need external power supply
```

### Printer Connected but Not Printing

```bash
# 1. Verify correct VID/PID
python3 -m escpos.printer list_devices

# 2. Check printer status (out of paper, offline, etc.)
# Check physical printer LED indicators

# 3. Try test print
python3 << 'EOF'
from escpos.printer import Usb
p = Usb(0x04b8, 0x0202)
p.text("TEST\n")
p.cut()
EOF
```

### "No module named 'escpos'" Error

```bash
# Install escpos module
npm install escpos
# or for Linux system-wide:
pip3 install python-escpos
```

### Printer Hangs or Freezes

```bash
# 1. Reset the printer (power cycle)
# 2. Check paper feeder
# 3. Clear any paper jams
# 4. Check for firmware updates on printer
```

## Testing the Print Endpoint

Once configured, test the print endpoint:

```bash
curl -X POST http://localhost:8081/print-ticket \
  -H "Content-Type: application/json" \
  -d '{
    "age": "18-25",
    "facility": "Building A",
    "ticketNumber": "TKT-1234567890",
    "originalPrice": 100,
    "discountPrice": 80,
    "hasDiscount": true,
    "transactionId": "TKT-1234567890"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Ticket printed successfully via ESC/POS",
  "transactionId": "TKT-1234567890",
  "timestamp": "2026-03-17T10:30:45.123Z"
}
```

## Printer Paper and Maintenance

### Paper Specifications
- **Width**: 80mm or 58mm (depending on printer)
- **Quality**: Thermal paper recommended
- **Darkness**: Adjust in printer settings

### Recommended Printers for CTU-Kiosk

1. **Epson TM-T88 VI** - Professional, reliable, USB
2. **Star Micronics mPOP** - Compact, kitchen/counter friendly
3. **Zebra ZD410** - Industrial, highly durable

## Printer Power Requirements

- **USB-powered**: Up to 500mA typical
- **AC-powered**: Recommended for 80mm printers
- **Battery**: Not recommended (thermal printing requires consistent power)

Most modern thermal printers use AC power or dual USB/AC input.

## Advanced Configuration

### Custom Ticket Format

Edit the `/print-ticket` endpoint in `mqtt_payment_backend.js` to customize:
- Text formatting (bold, size, alignment)
- Logo/image placement
- Barcode types
- Paper feed settings

### Printer Status Monitoring

```javascript
// Check printer status (when implemented)
GET /printer-status
// Response: { connected: true, paperLow: false, temperature: 65 }
```

## Support

For issues:

1. Check printer connection: `lsusb`
2. Review backend logs: `npm start`
3. Verify environment variables: `.env` file
4. Test with Python: `python3 -c "from escpos.printer import Usb; ..."`

## FAQ

**Q: Can I use my old CUPS-configured printer?**
A: ESC/POS is more direct and faster. For best results, use a USB or network thermal printer.

**Q: Does this work on non-Raspberry Pi systems?**
A: Yes! Works on any Linux, macOS, or Windows system with Node.js.

**Q: What if I need to print on regular 8.5x11" paper?**
A: ESC/POS is optimized for thermal receipts. For regular paper, consider a different printer type.

**Q: Can I print images/logos?**
A: Yes! The new ESC/POS implementation supports image/QR code printing.

---

**Last Updated**: March 17, 2026
**Currency**: Philippine Peso (₱)
**Printer Protocol**: ESC/POS
