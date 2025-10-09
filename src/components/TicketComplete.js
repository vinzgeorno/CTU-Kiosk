import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { FaCheckCircle, FaDownload, FaHome, FaPrint } from 'react-icons/fa';
import ThermalPrinter from '../utils/thermalPrinter';
import './TicketComplete.css';

function TicketComplete({ userData, setUserData }) {
  const navigate = useNavigate();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [thermalPrinter] = useState(new ThermalPrinter());
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    // Generate QR code when component mounts
    generateQRCode();
    
    // Auto-print to thermal printer after 2 seconds
    const timer = setTimeout(() => {
      printThermalTicket();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const generateQRCode = async () => {
    try {
      const qrData = JSON.stringify({
        transactionId: userData.transactionId,
        name: userData.name,
        facility: userData.selectedBuilding?.name,
        amount: userData.ticketPrice,
        date: new Date().toISOString(),
        validUntil: new Date().setHours(23, 59, 59, 999)
      });
      
      const qrCodeURL = await QRCode.toDataURL(qrData, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataURL(qrCodeURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = () => {
    const date = new Date();
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  const getValidUntil = () => {
    const date = new Date();
    // Set to end of current day (11:59 PM)
    date.setHours(23, 59, 59, 999);
    return date.toLocaleString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      month: 'short',
      day: 'numeric'
    });
  };

  const downloadTicketPDF = async () => {
    setIsGeneratingPDF(true);
    
    const ticketElement = document.getElementById('ticket-to-print');
    
    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`ticket-${userData.transactionId}.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
    
    setIsGeneratingPDF(false);
  };

  const printThermalTicket = async () => {
    setIsPrinting(true);
    
    try {
      const ticketData = {
        name: userData.name,
        facility: userData.selectedBuilding?.name,
        amount: userData.ticketPrice,
        transactionId: userData.transactionId,
        date: new Date().toISOString(),
        qrCodeDataURL: qrCodeDataURL,
        qrData: {
          transactionId: userData.transactionId,
          name: userData.name,
          facility: userData.selectedBuilding?.name,
          amount: userData.ticketPrice,
          date: new Date().toISOString(),
          validUntil: new Date().setHours(23, 59, 59, 999)
        }
      };

      // Try Web Serial API first (for direct thermal printer connection)
      if ('serial' in navigator) {
        const commands = thermalPrinter.generateTicketCommands(ticketData);
        const result = await thermalPrinter.printViaWebSerial(commands);
        
        if (result.success) {
          console.log('Thermal printing successful');
        } else {
          console.log('Web Serial failed, falling back to system print');
          await thermalPrinter.printViaSystemDialog(ticketData);
        }
      } else {
        // Fallback to system print dialog
        console.log('Web Serial not supported, using system print');
        await thermalPrinter.printViaSystemDialog(ticketData);
      }
      
    } catch (error) {
      console.error('Thermal printing error:', error);
    }
    
    setIsPrinting(false);
  };

  const startNewTransaction = () => {
    setUserData({
      hasID: null,
      name: '',
      capturedImage: null,
      selectedBuilding: null,
      ticketPrice: 0,
      transactionId: null
    });
    navigate('/');
  };

  return (
    <div className="ticket-complete fade-in">
      <div className="complete-container">
        <div className="success-header">
          <FaCheckCircle className="success-icon" />
          <h1>Payment Successful!</h1>
          <p>Your ticket has been generated and is ready for download</p>
        </div>

        <div className="final-ticket" id="ticket-to-print">
          <div className="ticket-design">
            <div className="ticket-top">
              <div className="company-logo">
                <div className="logo-circle">BA</div>
                <span>Building Access</span>
              </div>
              <div className="ticket-type">VISITOR PASS</div>
            </div>

            <div className="ticket-main">
              {userData.capturedImage && (
                <div className="visitor-photo">
                  <img src={userData.capturedImage} alt="Visitor" />
                </div>
              )}

              <div className="visitor-details">
                <h2>{userData.name}</h2>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Transaction ID</span>
                    <span className="detail-value">{userData.transactionId}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date</span>
                    <span className="detail-value">{formatDate()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">{formatTime()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Valid Until</span>
                    <span className="detail-value">{getValidUntil()}</span>
                  </div>
                </div>
              </div>

              <div className="access-info">
                <div className="building-access">
                  <h3>Building Access</h3>
                  <div className="building-name">{userData.selectedBuilding?.name}</div>
                  <div className="access-level">VISITOR ACCESS</div>
                </div>
                <div className="price-info">
                  <span className="price-label">Amount Paid</span>
                  <span className="price-value">₱{userData.ticketPrice}.00</span>
                </div>
              </div>

              <div className="ticket-footer">
                <div className="qrcode-section">
                  {qrCodeDataURL && (
                    <img src={qrCodeDataURL} alt="QR Code" className="qr-code" />
                  )}
                  <div className="qrcode-text">{userData.transactionId}</div>
                </div>
                <div className="instructions">
                  <p>Please keep this ticket with you at all times</p>
                  <p>Scan QR code at the entrance</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            onClick={printThermalTicket} 
            className="print-button"
            disabled={isPrinting}
          >
            {isPrinting ? (
              <>
                <div className="spinner-small"></div>
                Printing to Thermal Printer...
              </>
            ) : (
              <>
                <FaPrint /> Print Thermal Ticket
              </>
            )}
          </button>

          <button 
            onClick={downloadTicketPDF} 
            className="download-button"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <div className="spinner-small"></div>
                Generating PDF...
              </>
            ) : (
              <>
                <FaDownload /> Download PDF Backup
              </>
            )}
          </button>
          
          <button onClick={startNewTransaction} className="new-transaction-button">
            <FaHome /> Start New Transaction
          </button>
        </div>

        <div className="print-notice">
          <FaPrint className="print-icon" />
          <p>Ticket will be automatically printed to JP-58H thermal printer</p>
        </div>
      </div>
    </div>
  );
}

export default TicketComplete;
