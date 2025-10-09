import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMoneyBillWave, FaCoins } from 'react-icons/fa';
import './PaymentPage.css';

function PaymentPage({ userData, setUserData }) {
  const navigate = useNavigate();
  const [insertedAmount, setInsertedAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentMethod = (method) => {
    setPaymentMethod(method);
  };

  const insertMoney = (amount) => {
    setInsertedAmount(prev => prev + amount);
  };

  const processPayment = () => {
    if (insertedAmount >= userData.ticketPrice) {
      setIsProcessing(true);
      
      // Save transaction to JSON database
      const transaction = {
        id: 'TKT-' + Date.now(),
        timestamp: new Date().toISOString(),
        name: userData.name,
        building: userData.selectedBuilding.name,
        amount: userData.ticketPrice,
        paymentMethod: paymentMethod,
        image: userData.capturedImage
      };

      // Store in localStorage as JSON database
      const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
      existingTransactions.push(transaction);
      localStorage.setItem('transactions', JSON.stringify(existingTransactions));

      setUserData({
        ...userData,
        transactionId: transaction.id
      });

      // Simulate payment processing
      setTimeout(() => {
        navigate('/ticket-complete');
      }, 2000);
    }
  };

  const change = insertedAmount - userData.ticketPrice;

  return (
    <div className="payment-page fade-in">
      <div className="payment-container">
        <h1 className="payment-title">Payment Processing</h1>
        
        <div className="payment-content">
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

          <div className="payment-methods">
            <h2>Select Payment Method</h2>
            <div className="method-cards">
              <div 
                className={`method-card ${paymentMethod === 'bills' ? 'selected' : ''}`}
                onClick={() => handlePaymentMethod('bills')}
              >
                <FaMoneyBillWave className="method-icon" />
                <span>Bills</span>
              </div>
              <div 
                className={`method-card ${paymentMethod === 'coins' ? 'selected' : ''}`}
                onClick={() => handlePaymentMethod('coins')}
              >
                <FaCoins className="method-icon" />
                <span>Coins</span>
              </div>
            </div>
          </div>

          {paymentMethod && (
            <div className="payment-interface">
              <h2>Insert Payment</h2>
              
              {paymentMethod === 'bills' && (
                <div className="bill-buttons">
                  <button onClick={() => insertMoney(20)} className="bill-button">₱20</button>
                  <button onClick={() => insertMoney(50)} className="bill-button">₱50</button>
                  <button onClick={() => insertMoney(100)} className="bill-button">₱100</button>
                  <button onClick={() => insertMoney(500)} className="bill-button">₱500</button>
                </div>
              )}

              {paymentMethod === 'coins' && (
                <div className="coin-buttons">
                  <button onClick={() => insertMoney(1)} className="coin-button">₱1</button>
                  <button onClick={() => insertMoney(5)} className="coin-button">₱5</button>
                  <button onClick={() => insertMoney(10)} className="coin-button">₱10</button>
                  <button onClick={() => insertMoney(20)} className="coin-button">₱20</button>
                </div>
              )}

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
          )}
        </div>
      </div>
    </div>
  );
}

export default PaymentPage;
