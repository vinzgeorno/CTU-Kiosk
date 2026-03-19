import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { FaCheckCircle, FaHome, FaPrint } from 'react-icons/fa';
import database from '../utils/indexedDatabase';
import './TicketComplete.css';

function TicketComplete({ userData, setUserData }) {
  const navigate = useNavigate();
  const [isPrinting, setIsPrinting] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(15);

  useEffect(() => {
    // Initialize database and save ticket data
    initializeAndSaveTicket();
    
    // Generate QR code when component mounts
    generateQRCode();

    // Auto-return to main page after 15 seconds
    const countdownTimer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          startNewTransaction();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeAndSaveTicket = async () => {
    try {
      // Initialize database
      await database.initialize();
      
      // Save ticket data to SQLite database
      await saveTicketToDatabase();
    } catch (error) {
      console.error('Error initializing database or saving ticket:', error);
    }
  };

  const saveTicketToDatabase = async () => {
    try {
      const currentDate = new Date();
      const expiryDate = new Date();
      expiryDate.setHours(23, 59, 59, 999); // End of current day

      const qrData = {
        transactionId: userData.transactionId,
        name: userData.name,
        facility: userData.selectedBuilding?.name,
        amount: userData.ticketPrice,
        date: currentDate.toISOString(),
        validUntil: expiryDate.getTime()
      };

      const ticketData = {
        referenceNumber: userData.transactionId,
        name: userData.name,
        age: userData.age,
        facility: userData.selectedBuilding?.name,
        paymentAmount: userData.ticketPrice,
        originalPrice: userData.originalPrice || userData.ticketPrice,
        hasDiscount: userData.hasDiscount || false,
        dateCreated: currentDate.toISOString(),
        dateExpiry: expiryDate.toISOString(),
        qrCodeData: JSON.stringify(qrData),
        paymentMethod: userData.paymentMethod || 'cash',
        amountInserted: userData.amountInserted || userData.ticketPrice,
        changeGiven: userData.changeGiven || 0
      };

      const result = await database.insertTicket(ticketData);
      
      if (result.success) {
        console.log('Ticket saved to database successfully:', result.referenceNumber);
      } else {
        console.error('Failed to save ticket to database:', result.error);
      }
    } catch (error) {
      console.error('Error saving ticket to database:', error);
    }
  };

  const generateQRCode = async () => {
    try {
      // Only include the transaction ID in the QR code
      const qrData = userData.transactionId;
      
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

  const startNewTransaction = () => {
    setUserData({
      name: '',
      age: null,
      selectedBuilding: null,
      ticketPrice: 0,
      transactionId: null
    });
    navigate('/');
  };

  const printTicket = async () => {
    setIsPrinting(true);
    
    try {
      console.log('🖨️ Sending print request with data:', {
        age: userData.age,
        facility: userData.selectedBuilding?.name,
        ticketNumber: userData.transactionId,
        discountPrice: userData.ticketPrice,
        originalPrice: userData.originalPrice || userData.ticketPrice,
        hasDiscount: userData.hasDiscount || false
      });

      // Send ticket data to backend instead of image
      const response = await fetch('http://localhost:8081/print-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          age: userData.age,
          facility: userData.selectedBuilding?.name,
          ticketNumber: userData.transactionId,
          originalPrice: userData.originalPrice || userData.ticketPrice,
          discountPrice: userData.ticketPrice,
          hasDiscount: userData.hasDiscount || false,
          transactionId: userData.transactionId
        })
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        console.log('✅ Ticket printed successfully');
        alert('Ticket printed successfully!');
      } else {
        console.error('❌ Print failed:', result.error);
        alert(`Failed to print ticket: ${result.error}`);
      }
    } catch (error) {
      console.error('Error printing ticket:', error);
      alert(`Error: Make sure backend is running on localhost:8081. ${error.message}`);
    }
    
    setIsPrinting(false);
  };

  return (
    <div className="ticket-complete fade-in">
      <div className="complete-container">
        <div className="ticket-section">
          <div className="final-ticket" id="ticket-to-print">
            <div className="ticket-design compact">
              <div className="ticket-top">
                <div className="company-logo">
                  <div className="logo-circle">BA</div>
                  <span>Building Access</span>
                </div>
                <div className="ticket-type">VISITOR PASS</div>
              </div>

              <div className="ticket-main">
                <div className="visitor-details">
                  <h2>{userData.name}</h2>
                  <div className="detail-grid compact">
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
                    <p>Scan QR code at entrance</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="controls-section">
          <div className="success-header">
            <FaCheckCircle className="success-icon" />
            <h1>Payment Successful!</h1>
            <p>Your ticket has been generated and is ready for download</p>
            <div className="countdown-timer">
              <p>Auto-return in <span className="timer">{timeRemaining}</span> seconds</p>
            </div>
          </div>

          <div className="action-buttons">
            <button 
              onClick={printTicket} 
              className="print-button"
              disabled={isPrinting}
            >
              {isPrinting ? (
                <>
                  <div className="spinner-small"></div>
                  Printing...
                </>
              ) : (
                <>
                  <FaPrint /> Print Ticket
                </>
              )}
            </button>
            
            <button onClick={startNewTransaction} className="new-transaction-button">
              <FaHome /> Start New Transaction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketComplete;
