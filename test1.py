from escpos.printer import Usb
try:
    p = Usb(0x04b8, 0x0202)  # Replace with your VID, PID
    p.text("Test Print\n")
    p.cut()
    print("✅ USB Printer Connected Successfully")
except Exception as e:
    print(f"❌ Error: {e}")