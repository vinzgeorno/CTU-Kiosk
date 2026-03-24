import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaCoins } from 'react-icons/fa';
import paymentHardware from '../utils/paymentHardware';
import './PaymentPage.css';

function PaymentPage({ userData, setUserData }) {
  const navigate = useNavigate();
  const [insertedAmount, setInsertedAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hardwareStatus, setHardwareStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [ws, setWs] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Use refs for deduplication to avoid async state race conditions
  const lastProcessedCoinRef = useRef(null);
  const lastProcessedBillRef = useRef(null);
  const isConnectingRef = useRef(false);

  // Initialize payment hardware on component mount
  useEffect(() => {
    console.log('🎯 PaymentPage Mounted');
    
    // Initialize WebSocket connection for real hardware first
    initializeWebSocket();

    // Fallback: Initialize simulator ONLY if WebSocket fails
    const simulatorTimeout = setTimeout(() => {
      if (connectionStatus === 'disconnected') {
        console.log('⚠️ Real hardware unavailable - Starting simulator...');
        initializeSimulator();
      }
    }, 2000); // Wait 2 seconds for real hardware connection

    return () => {
      clearTimeout(simulatorTimeout);
      paymentHardware.stopMonitoring();
      if (ws) {
        ws.close();
      }
      console.log('🎯 PaymentPage Unmounted');
    };
  }, []);

  /**
   * Initialize simulator fallback (only if real hardware unavailable)
   */
  const initializeSimulator = () => {
    paymentHardware.initialize({
      onCoinDetected: (data) => {
        console.log('💰 Simulator Coin Detected:', data);
        setInsertedAmount(prev => prev + data.value);
        addLog(`[COIN] ✓ ${data.pulses} pulses → ₱${data.value}`);
      },
      onBillDetected: (data) => {
        console.log('💵 Simulator Bill Detected:', data);
        setInsertedAmount(prev => prev + data.amount);
        addLog(`[BILL] ✓ ${data.pulses} pulses → ₱${data.amount}`);
      },
      onPaymentUpdate: (data) => {
        setHardwareStatus(data);
      }
    });

    paymentHardware.startMonitoring();
  };

  /**
   * Initialize WebSocket connection to backend for real-time pulse updates
   */
  const initializeWebSocket = () => {
    // Prevent multiple concurrent connection attempts
    if (isConnectingRef.current) {
      console.log('⚠️ [WebSocket] Connection already in progress, skipping...');
      return;
    }
    isConnectingRef.current = true;
    
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.hostname}:8081`;
      
      console.log(`🔌 [WebSocket] Connecting to ${wsUrl}...`);
      const newWs = new WebSocket(wsUrl);

      newWs.onopen = () => {
        console.log('✅ [WebSocket] Connected to payment backend');
        isConnectingRef.current = false;
        setConnectionStatus('connected');
        addLog('🌐 Live hardware connected');
        
        // Store WebSocket globally for dispense commands
        window.dispenseWebSocket = newWs;
        
        // Request initial status
        newWs.send(JSON.stringify({ type: 'status' }));
      };

      newWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📨 [WebSocket] Received:', data);

          if (data.type === 'init') {
            // Do nothing with init, just confirm connection
          } else if (data.type === 'coin') {
            handleRealCoinPulse(data);
          } else if (data.type === 'bill') {
            handleRealBillPulse(data);
          } else if (data.type === 'status') {
            console.log('📊 Payment status:', data.state);
          }
        } catch (error) {
          console.error('❌ [WebSocket] Parse error:', error);
        }
      };

      newWs.onerror = (error) => {
        console.error('❌ [WebSocket] Error:', error);
        isConnectingRef.current = false;
        setConnectionStatus('error');
        addLog('⚠️ Real-time connection error');
      };

      newWs.onclose = () => {
        console.log('🔌 [WebSocket] Disconnected from backend');
        setConnectionStatus('disconnected');
        addLog('🔌 Connection closed - simulator mode');
      };

      setWs(newWs);
    } catch (error) {
      console.error('❌ [WebSocket] Connection failed:', error);
      isConnectingRef.current = false;
      setConnectionStatus('error');
      addLog('⚠️ Could not connect to backend');
    }
  };

  /**
   * Handle real coin pulse from actual hardware
   */
  const handleRealCoinPulse = (data) => {
    // Deduplication using ref (synchronous, prevents race conditions)
    const pulseKey = `${data.pulses}-${data.value}-${data.timestamp}`;
    if (lastProcessedCoinRef.current === pulseKey) {
      console.log('⚠️ [DUPLICATE] Ignoring duplicate coin pulse');
      return;
    }
    
    lastProcessedCoinRef.current = pulseKey;
    console.log('⚡ [REAL HARDWARE] Coin pulse detected:', data);
    console.log(`💰 [FRONTEND] Adding ₱${data.value} to insertedAmount`);
    console.log(`💰 [FRONTEND] Old total: ₱${insertedAmount}, New total: ₱${insertedAmount + (data.value || 0)}`);
    setInsertedAmount(prev => {
      const newAmount = prev + (data.value || 0);
      console.log(`💰 [FRONTEND] Updated: ₱${prev} → ₱${newAmount}`);
      return newAmount;
    });
    addLog(`⚡ [REAL COIN] +₱${data.value}`);
  };

  /**
   * Handle real bill pulse from actual hardware
   */
  const handleRealBillPulse = (data) => {
    // Deduplication using ref (synchronous, prevents race conditions)
    const pulseKey = `${data.pulses}-${data.amount}-${data.timestamp}`;
    if (lastProcessedBillRef.current === pulseKey) {
      console.log('⚠️ [DUPLICATE] Ignoring duplicate bill pulse');
      return;
    }
    
    lastProcessedBillRef.current = pulseKey;
    console.log('⚡ [REAL HARDWARE] Bill pulse detected:', data);
    console.log(`💵 [FRONTEND] Adding ₱${data.amount} to insertedAmount`);
    console.log(`💵 [FRONTEND] Old total: ₱${insertedAmount}, New total: ₱${insertedAmount + (data.amount || 0)}`);
    setInsertedAmount(prev => {
      const newAmount = prev + (data.amount || 0);
      console.log(`💵 [FRONTEND] Updated: ₱${prev} → ₱${newAmount}`);
      return newAmount;
    });
    addLog(`⚡ [REAL BILL] +₱${data.amount}`);
  };

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-20)); // Keep last 20 logs
  };

  const processPayment = () => {
    if (insertedAmount >= userData.ticketPrice) {
      setIsProcessing(true);
      addLog(`✅ Payment approved | Processing transaction...`);
      
      // Calculate change
      const changeAmount = insertedAmount - userData.ticketPrice;
      
      // Create transaction ID
      const transactionId = 'TKT-' + Date.now();
      
      console.log('🎫 Processing Payment:', {
        transactionId,
        amountInserted: insertedAmount,
        ticketPrice: userData.ticketPrice,
        changeGiven: changeAmount
      });

      // Auto-dispense change if needed (only 5PHP coins)
      // DISABLED - Change amount will be shown in ticket instead
      /*
      if (changeAmount > 0) {
        if (changeAmount % 5 === 0) {
          console.log(`💰 AUTO-DISPENSING CHANGE: ₱${changeAmount}`);
          const dispenseResult = paymentHardware.dispenseChange(changeAmount);
          
          if (dispenseResult.success) {
            addLog(`✅ Change dispense triggered: ₱${changeAmount} (${dispenseResult.coins} × ₱5)`);
            console.log('🪙 Dispense command sent:', dispenseResult);
          } else {
            addLog(`⚠️ Change dispense failed: ${dispenseResult.reason}`);
          }
        } else {
          addLog(`⚠️ Cannot dispense change: ₱${changeAmount} not divisible by 5`);
        }
      } else {
        addLog(`ℹ️ No change needed`);
      }
      */
      
      // Update user data with payment information
      setUserData({
        ...userData,
        transactionId: transactionId,
        paymentMethod: 'mixed', // Both coin and bill accepted
        amountInserted: insertedAmount,
        changeGiven: changeAmount
      });

      // Stop hardware monitoring before navigation
      paymentHardware.resetCredit();

      // Simulate payment processing
      setTimeout(() => {
        navigate('/ticket-complete');
      }, 2000);
    } else {
      addLog(`⚠️ Insufficient payment: ₱${insertedAmount} < ₱${userData.ticketPrice}`);
    }
  };

  const change = insertedAmount - userData.ticketPrice;

  return (
    <div className="payment-page fade-in">
      <div className="payment-container">
        <h1 className="payment-title">Payment Processing</h1>
        
        <div className="payment-content">
          <div className="payment-left-section">
            <div className="payment-interface">
              <h2>Insert Payment</h2>
              
              <div className="payment-instructions">
                <p>💰 Insert coins or bills</p>
                <p>Both payment methods are active</p>
              </div>

              <div className="payment-status">
                  <div className="status-row">
                    <span>Amount Due:</span>
                    <strong>₱{userData.ticketPrice}.00</strong>
                  </div>
                  <div className="status-row">
                    <span>Amount Inserted:</span>
                    <strong className={insertedAmount >= userData.ticketPrice ? 'sufficient' : ''}>
                      ₱{insertedAmount.toFixed(2)}
                    </strong>
                  </div>
                  {change > 0 && (
                    <div className="status-row change">
                      <span>Change:</span>
                      <strong>₱{change.toFixed(2)}</strong>
                    </div>
                  )}
                </div>

                <button
                  className="confirm-payment-button"
                  onClick={processPayment}
                  disabled={insertedAmount < userData.ticketPrice || isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <div className="processing-spinner"></div>
                      Processing...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>

          <div className="payment-right-section">
            <div className="payment-summary">
              <h2>Order Summary</h2>
              <div className="summary-card">
                <div className="summary-row">
                  <span>Visitor:</span>
                  <strong>{userData.name}</strong>
                </div>
                <div className="summary-row">
                  <span>Building:</span>
                  <strong>{userData.selectedBuilding?.name}</strong>
                </div>
                <div className="summary-row total">
                  <span>Total Amount:</span>
                  <strong className="amount">₱{userData.ticketPrice}.00</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
