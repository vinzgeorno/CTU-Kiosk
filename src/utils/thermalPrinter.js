// Thermal Printer Utility for JP-58H (58mm width)
// This handles ESC/POS commands for thermal printing

class ThermalPrinter {
  constructor() {
    this.commands = {
      INIT: '\x1B\x40',           // Initialize printer
      FEED_LINE: '\x0A',          // Line feed
      CUT_PAPER: '\x1D\x56\x42\x00', // Cut paper
      ALIGN_LEFT: '\x1B\x61\x00',
      ALIGN_CENTER: '\x1B\x61\x01',
      ALIGN_RIGHT: '\x1B\x61\x02',
      FONT_NORMAL: '\x1B\x21\x00',
      FONT_BOLD: '\x1B\x21\x08',
      FONT_LARGE: '\x1B\x21\x10',
      FONT_UNDERLINE: '\x1B\x2D\x01',
      FONT_UNDERLINE_OFF: '\x1B\x2D\x00',
      QR_CODE: '\x1D\x28\x6B',
    };
  }

  // Format text for 58mm printer (approximately 32 characters wide)
  formatLine(text, maxWidth = 32) {
    if (text.length <= maxWidth) {
      return text;
    }
    return text.substring(0, maxWidth - 3) + '...';
  }

  // Center text within the width
  centerText(text, width = 32) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  // Create separator line
  createSeparator(char = '-', width = 32) {
    return char.repeat(width);
  }

  // Generate ESC/POS commands for ticket
  generateTicketCommands(ticketData) {
    const { name, facility, amount, transactionId, date, qrData } = ticketData;
    
    let commands = '';
    
    // Initialize printer
    commands += this.commands.INIT;
    
    // Header
    commands += this.commands.ALIGN_CENTER;
    commands += this.commands.FONT_BOLD;
    commands += 'CAMPUS FACILITY ACCESS\n';
    commands += this.commands.FONT_NORMAL;
    commands += 'VISITOR PASS\n';
    commands += this.createSeparator() + '\n';
    
    // Visitor info
    commands += this.commands.ALIGN_LEFT;
    commands += this.commands.FONT_NORMAL;
    commands += `Name: ${this.formatLine(name, 26)}\n`;
    commands += `Facility: ${this.formatLine(facility, 23)}\n`;
    commands += `Amount: PHP ${amount}.00\n`;
    commands += `Date: ${new Date(date).toLocaleDateString()}\n`;
    commands += `Time: ${new Date(date).toLocaleTimeString()}\n`;
    commands += `Valid Until: 11:59 PM Today\n`;
    commands += this.createSeparator() + '\n';
    
    // Transaction ID
    commands += this.commands.ALIGN_CENTER;
    commands += `ID: ${transactionId}\n`;
    commands += this.createSeparator() + '\n';
    
    // QR Code (if supported by printer)
    if (qrData) {
      commands += this.generateQRCode(qrData);
    }
    
    // Instructions
    commands += this.commands.ALIGN_CENTER;
    commands += this.commands.FONT_NORMAL;
    commands += 'Scan QR code at entrance\n';
    commands += 'Keep this ticket with you\n';
    commands += this.createSeparator() + '\n';
    
    // Footer
    commands += 'Thank you for your visit!\n';
    commands += '\n\n';
    
    // Cut paper
    commands += this.commands.CUT_PAPER;
    
    return commands;
  }

  // Generate QR Code ESC/POS commands
  generateQRCode(data) {
    const qrData = JSON.stringify(data);
    const dataLength = qrData.length;
    
    let commands = '';
    
    // QR Code model
    commands += '\x1D\x28\x6B\x04\x00\x31\x41\x32\x00';
    
    // QR Code size (1-16, where 3 is good for 58mm)
    commands += '\x1D\x28\x6B\x03\x00\x31\x43\x03';
    
    // QR Code error correction level
    commands += '\x1D\x28\x6B\x03\x00\x31\x45\x31';
    
    // Store QR Code data
    const pL = (dataLength + 3) % 256;
    const pH = Math.floor((dataLength + 3) / 256);
    commands += `\x1D\x28\x6B${String.fromCharCode(pL)}${String.fromCharCode(pH)}\x31\x50\x30${qrData}`;
    
    // Print QR Code
    commands += '\x1D\x28\x6B\x03\x00\x31\x51\x30';
    
    commands += '\n';
    
    return commands;
  }

  // Send commands to printer via Web Serial API (Chrome/Edge)
  async printViaWebSerial(commands) {
    try {
      // Request serial port
      const port = await navigator.serial.requestPort();
      
      // Open port with appropriate settings for thermal printer
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Send commands
      await writer.write(encoder.encode(commands));
      
      // Close connection
      writer.releaseLock();
      await port.close();
      
      return { success: true };
    } catch (error) {
      console.error('Serial printing error:', error);
      return { success: false, error: error.message };
    }
  }

  // Alternative: Print via system print dialog (fallback)
  async printViaSystemDialog(ticketData) {
    try {
      // Create a formatted text version for system printing
      const printContent = this.createPrintableHTML(ticketData);
      
      // Open print dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
      
      return { success: true };
    } catch (error) {
      console.error('System print error:', error);
      return { success: false, error: error.message };
    }
  }

  // Create HTML for system printing (58mm width simulation)
  createPrintableHTML(ticketData) {
    const { name, facility, amount, transactionId, date, qrCodeDataURL } = ticketData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thermal Ticket</title>
        <style>
          @media print {
            body { margin: 0; }
            .ticket { width: 58mm; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 5mm;
          }
          .ticket {
            width: 58mm;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .separator { border-top: 1px dashed #000; margin: 5px 0; }
          .qr-code { width: 80px; height: 80px; margin: 10px auto; display: block; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="center bold">CAMPUS FACILITY ACCESS</div>
          <div class="center">VISITOR PASS</div>
          <div class="separator"></div>
          
          <div>Name: ${name}</div>
          <div>Facility: ${facility}</div>
          <div>Amount: PHP ${amount}.00</div>
          <div>Date: ${new Date(date).toLocaleDateString()}</div>
          <div>Time: ${new Date(date).toLocaleTimeString()}</div>
          <div>Valid Until: 11:59 PM Today</div>
          <div class="separator"></div>
          
          <div class="center">ID: ${transactionId}</div>
          <div class="separator"></div>
          
          ${qrCodeDataURL ? `<img src="${qrCodeDataURL}" class="qr-code" alt="QR Code">` : ''}
          
          <div class="center">Scan QR code at entrance</div>
          <div class="center">Keep this ticket with you</div>
          <div class="separator"></div>
          
          <div class="center">Thank you for your visit!</div>
        </div>
      </body>
      </html>
    `;
  }
}

export default ThermalPrinter;
