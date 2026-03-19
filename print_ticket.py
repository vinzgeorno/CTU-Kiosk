#!/home/ctukiosk/Documents/Capstone/CTU-Kiosk/escpos-env/bin/python3
"""
ESC/POS Thermal Printer Helper
Called by Node.js backend to print tickets
Usage: python3 print_ticket.py <json_data>
"""

import sys
import json
import io
from escpos.printer import Usb
from PIL import Image
import qrcode

def print_ticket(data):
    """Print ticket to thermal printer"""
    
    try:
        # Winbond Electronics printer
        printer = Usb(0x0416, 0x5011)
        
        # Extract data
        facility = data.get('facility', 'UNKNOWN')
        age = data.get('age', 'N/A')
        ticket_number = data.get('ticketNumber', '')
        original_price = data.get('originalPrice', 0)
        discount_price = data.get('discountPrice', 0)
        has_discount = data.get('hasDiscount', False)
        transaction_id = data.get('transactionId', '')
        
        # Print ticket using basic text methods
        printer.text('BUILDING ACCESS\n')
        printer.text('VISITOR PASS\n')
        printer.text('=' * 42 + '\n\n')
        
        printer.text(f'FACILITY: {facility.upper()}\n')
        printer.text(f'AGE GROUP: {age}\n')
        printer.text(f'TICKET #: {ticket_number}\n\n')
        
        # Price section
        if has_discount:
            printer.text(f'Original Price: ₱{original_price}\n')
            printer.text(f'FINAL PRICE:   ₱{discount_price}\n\n')
        else:
            printer.text(f'PRICE: ₱{discount_price}\n\n')
        
        printer.text('Valid Until: 11:59 PM TODAY\n')
        printer.text('=' * 42 + '\n\n')
        
        # Transaction ID
        printer.text(f'TICKET: {transaction_id}\n\n')
        
        # Generate and print QR code
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_M,
                box_size=8,
                border=1,
            )
            qr.add_data(transaction_id)
            qr.make(fit=True)
            
            # Create QR code image
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            # Resize to fit 32 chars width on thermal printer (approx 200 pixels)
            qr_img = qr_img.resize((200, 200), Image.Resampling.LANCZOS)
            
            # Convert to ESC/POS compatible format
            printer.image(qr_img, high_density_vertical=True, high_density_horizontal=True)
            printer.text('\n')
        except Exception as e:
            print(f"Warning: Could not print QR code: {e}", file=sys.stderr)
            printer.text('QR Code: [Unavailable]\n')
        
        # Footer
        printer.text('Keep this ticket with you\n')
        printer.text('Scan at entrance on arrival\n\n')
        
        # Cut paper
        try:
            printer.cut()
        except:
            pass
        
        printer.close()
        
        print(json.dumps({
            'success': True,
            'message': 'Ticket printed successfully',
            'transactionId': transaction_id
        }))
        
        return True
        
    except Exception as e:
        print(json.dumps({
            'success': False,
            'error': str(e)
        }), file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    if len(sys.argv) > 1:
        try:
            data = json.loads(sys.argv[1])
            success = print_ticket(data)
            sys.exit(0 if success else 1)
        except json.JSONDecodeError as e:
            print(json.dumps({
                'success': False,
                'error': f'Invalid JSON: {e}'
            }), file=sys.stderr)
            sys.exit(1)
    else:
        print(json.dumps({
            'success': False,
            'error': 'No ticket data provided'
        }), file=sys.stderr)
        sys.exit(1)
