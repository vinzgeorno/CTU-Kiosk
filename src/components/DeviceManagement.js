import React, { useState, useEffect } from 'react';
import { 
  FaPrint, 
  FaCoins, 
  FaMoneyBillWave, 
  FaExchangeAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSpinner,
  FaArrowLeft
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { jsPDF } from 'jspdf';
import './DeviceManagement.css';

function DeviceManagement() {
  const [devices, setDevices] = useState({
    printer: { 
      connected: false, 
      status: 'Disconnected',
      testing: false,
      lastTested: null,
      expanded: false
    },
    coinAcceptor: { 
      connected: false, 
      status: 'Disconnected',
      testing: false,
      lastTested: null,
      lastCoin: null,
      expanded: false
    },
    billAcceptor: { 
      connected: false, 
      status: 'Disconnected',
      testing: false,
      lastTested: null,
      lastBill: null,
      expanded: false
    },
    changeDispenser: { 
      connected: false, 
      status: 'Disconnected',
      testing: false,
      lastTested: null,
      expanded: false
    }
  });

  const coinDenominations = [1, 5, 10, 20];
  const billDenominations = [20, 50, 100]; // Reduced to prevent layout issues

  useEffect(() => {
    // Simulate device detection
    const timer = setTimeout(() => {
      setDevices(prevDevices => ({
        printer: { 
          ...prevDevices.printer, 
          connected: true, 
          status: 'Connected',
          lastTested: null
        },
        coinAcceptor: { 
          ...prevDevices.coinAcceptor, 
          connected: true, 
          status: 'Connected',
          lastTested: null
        },
        billAcceptor: { 
          ...prevDevices.billAcceptor, 
          connected: true, 
          status: 'Connected',
          lastTested: null
        },
        changeDispenser: { 
          ...prevDevices.changeDispenser, 
          connected: true, 
          status: 'Connected',
          lastTested: null
        }
      }));
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handlePrintTestPage = async () => {
    setDevices(prev => ({
      ...prev,
      printer: { 
        ...prev.printer, 
        testing: true, 
        status: 'Printing test page...' 
      }
    }));

    try {
      // Create a new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add content to the PDF
      doc.setFontSize(20);
      doc.text('Printer Test Page', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('This is a test print from CTU Kiosk', pageWidth / 2, 40, { align: 'center' });
      doc.text(`Printed on: ${new Date().toLocaleString()}`, pageWidth / 2, 50, { align: 'center' });
      
      // Save the PDF
      doc.save('printer-test.pdf');
      
      // Update status
      setDevices(prev => ({
        ...prev,
        printer: {
          ...prev.printer,
          testing: false,
          status: 'Print Successful',
          lastTested: new Date().toLocaleTimeString(),
          connected: true
        }
      }));
      
      toast.success('Test page printed successfully!', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setDevices(prev => ({
        ...prev,
        printer: {
          ...prev.printer,
          testing: false,
          status: 'Print Failed',
          lastTested: new Date().toLocaleTimeString()
        }
      }));
      
      toast.error('Failed to generate test page', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true
      });
    }
  };

  const simulateCoinInsertion = (amount) => {
    setDevices(prev => ({
      ...prev,
      coinAcceptor: {
        ...prev.coinAcceptor,
        lastCoin: amount,
        lastTested: new Date().toLocaleTimeString(),
        connected: true
      }
    }));
    
    toast.success(`Inserted ₱${amount} coin`, {
      position: 'top-right',
      autoClose: 2000,
      hideProgressBar: true
    });
  };

  const simulateBillInsertion = (amount) => {
    setDevices(prev => ({
      ...prev,
      billAcceptor: {
        ...prev.billAcceptor,
        lastBill: amount,
        lastTested: new Date().toLocaleTimeString(),
        connected: true
      }
    }));
    
    toast.success(`Inserted ₱${amount} bill`, {
      position: 'top-right',
      autoClose: 2000,
      hideProgressBar: true
    });
  };

  const toggleDeviceExpanded = (deviceType) => {
    setDevices(prev => ({
      ...prev,
      [deviceType]: {
        ...prev[deviceType],
        expanded: !prev[deviceType].expanded
      }
    }));
  };

  const renderDeviceCard = (deviceType, icon, name) => {
    const device = devices[deviceType];
    
    return (
      <div className={`device-card-container ${device.expanded ? 'expanded' : ''}`}>
        <div 
          className={`device-card ${device.connected ? 'connected' : 'disconnected'}`}
          onClick={() => toggleDeviceExpanded(deviceType)}
        >
          <div className="device-icon">
            {device.testing ? (
              <FaSpinner className="fa-spin" />
            ) : (
              <>
                {icon}
                {device.connected ? (
                  <FaCheckCircle className="status-icon connected" />
                ) : (
                  <FaTimesCircle className="status-icon disconnected" />
                )}
              </>
            )}
          </div>
          <h3>{name}</h3>
          <p className={`status ${device.connected ? 'connected' : 'disconnected'}`}>
            {device.testing ? 'Testing...' : device.status}
          </p>
          {device.lastTested && (
            <p className="last-tested">Last tested: {device.lastTested}</p>
          )}
          <div className="expand-icon">
            {device.expanded ? '−' : '+'}
          </div>
        </div>
        
        {device.expanded && (
          <div className="device-detail">
            {deviceType === 'printer' && (
              <>
                <div className="device-info">
                  <p><strong>Status:</strong> {device.status}</p>
                  {device.lastTested && (
                    <p><strong>Last Tested:</strong> {device.lastTested}</p>
                  )}
                </div>
                <button 
                  className="test-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintTestPage();
                  }}
                  disabled={device.testing}
                >
                  {device.testing ? (
                    <><FaSpinner className="fa-spin" /> Printing Test Page...</>
                  ) : (
                    <><FaPrint /> Print Test Page</>
                  )}
                </button>
              </>
            )}
            
            {deviceType === 'coinAcceptor' && (
              <>
                <div className="device-info">
                  <p><strong>Status:</strong> {device.status}</p>
                  {device.lastCoin && (
                    <p><strong>Last Coin Inserted:</strong> ₱{device.lastCoin}</p>
                  )}
                  {device.lastTested && (
                    <p><strong>Last Tested:</strong> {device.lastTested}</p>
                  )}
                </div>
                <div className="coin-simulator">
                  <h3>Insert Test Coin</h3>
                  <div className="coin-buttons">
                    {coinDenominations.map(coin => (
                      <button 
                        key={coin}
                        className="coin-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          simulateCoinInsertion(coin);
                        }}
                      >
                        ₱{coin}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {deviceType === 'billAcceptor' && (
              <>
                <div className="device-info">
                  <p><strong>Status:</strong> {device.status}</p>
                  {device.lastBill && (
                    <p><strong>Last Bill Inserted:</strong> ₱{device.lastBill}</p>
                  )}
                  {device.lastTested && (
                    <p><strong>Last Tested:</strong> {device.lastTested}</p>
                  )}
                </div>
                <div className="bill-simulator">
                  <h3>Insert Test Bill</h3>
                  <div className="bill-buttons">
                    {billDenominations.map(bill => (
                      <button 
                        key={bill}
                        className="bill-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          simulateBillInsertion(bill);
                        }}
                      >
                        ₱{bill}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            
            {deviceType === 'changeDispenser' && (
              <div className="device-info">
                <p><strong>Status:</strong> {device.status}</p>
                {device.lastTested && (
                  <p><strong>Last Tested:</strong> {device.lastTested}</p>
                )}
                <p className="note">Change dispenser testing will be implemented in a future update.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="device-management">
      <div className="device-container">
        <h1 className="device-title">Device Management</h1>
        
        <div className="device-status">
          <h2>Device Status</h2>
          <div className="device-grid">
            {renderDeviceCard('printer', <FaPrint />, 'Thermal Printer')}
            {renderDeviceCard('coinAcceptor', <FaCoins />, 'Coin Acceptor')}
            {renderDeviceCard('billAcceptor', <FaMoneyBillWave />, 'Bill Acceptor')}
            {renderDeviceCard('changeDispenser', <FaExchangeAlt />, 'Change Dispenser')}
          </div>
        </div>
      </div>
    </div>
  );
}

const formatDeviceName = (deviceType) => {
  return deviceType
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
};

const DeviceCard = ({ 
  icon, 
  name, 
  status, 
  isConnected, 
  isTesting, 
  lastTested, 
  onClick 
}) => {
  return (
    <div 
      className={`device-card ${isConnected ? 'connected' : 'disconnected'}`}
      onClick={onClick}
    >
      <div className="device-icon">
        {isTesting ? (
          <FaSpinner className="fa-spin" />
        ) : (
          <>{icon}
            {isConnected ? (
              <FaCheckCircle className="status-icon connected" />
            ) : (
              <FaTimesCircle className="status-icon disconnected" />
            )}
          </>
        )}
      </div>
      <h3>{name}</h3>
      <p className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isTesting ? 'Testing...' : status}
      </p>
      {lastTested && (
        <p className="last-tested">Last tested: {lastTested}</p>
      )}
      
    </div>
  );
};

export default DeviceManagement;
