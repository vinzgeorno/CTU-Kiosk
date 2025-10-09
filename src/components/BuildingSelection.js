import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRunning, FaBasketballBall, FaTableTennis, FaSwimmer, FaDumbbell, FaVolleyballBall } from 'react-icons/fa';
import './BuildingSelection.css';

function BuildingSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const facilities = [
    { id: 1, name: 'Oval', icon: FaRunning, price: 20, color: '#4CAF50' },
    { id: 2, name: 'Basketball Gym/Kadasig Gym', icon: FaBasketballBall, price: 20, color: '#FF9800' },
    { id: 3, name: 'Badminton Court', icon: FaVolleyballBall, price: 20, color: '#2196F3' },
    { id: 4, name: 'Tennis Court', icon: FaTableTennis, price: 20, color: '#9C27B0' },
    { id: 5, name: 'Swimming Pool', icon: FaSwimmer, price: 100, color: '#00BCD4' },
    { id: 6, name: 'Fitness Gym', icon: FaDumbbell, price: 50, color: '#E91E63' }
  ];

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
  };

  const proceedToPayment = () => {
    if (selectedBuilding) {
      // Calculate price with age discount
      let finalPrice = selectedBuilding.price;
      if (userData.age && userData.age < 12) {
        finalPrice = selectedBuilding.price * 0.5; // 50% discount for under 12
      }
      
      setUserData({
        ...userData,
        selectedBuilding: selectedBuilding,
        ticketPrice: finalPrice,
        originalPrice: selectedBuilding.price,
        hasDiscount: userData.age && userData.age < 12
      });
      navigate('/payment');
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

  return (
    <div className="building-selection fade-in">
      <div className="selection-container">
        <div className="ticket-preview">
          <div className="ticket">
            <div className="ticket-header">
              <h2>Access Ticket</h2>
              <div className="ticket-date">{formatDate()}</div>
            </div>
            
            <div className="ticket-body">
              {userData.capturedImage && (
                <div className="ticket-photo">
                  <img src={userData.capturedImage} alt="Visitor" />
                </div>
              )}
              
              <div className="ticket-info">
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{userData.name || 'Guest'}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Time:</span>
                  <span className="value">{formatTime()}</span>
                </div>
                
                <div className="info-row">
                  <span className="label">Facility:</span>
                  <span className="value">
                    {selectedBuilding ? selectedBuilding.name : 'Not Selected'}
                  </span>
                </div>
                
                {userData.age && (
                  <div className="info-row">
                    <span className="label">Age:</span>
                    <span className="value">{userData.age}</span>
                  </div>
                )}
                
                <div className="info-row">
                  <span className="label">Access Fee:</span>
                  <span className="value price">
                    {selectedBuilding ? (
                      <>
                        {userData.age && userData.age < 12 ? (
                          <>
                            <span className="original-price">₱{selectedBuilding.price}.00</span>
                            <span className="discounted-price">₱{(selectedBuilding.price * 0.5).toFixed(2)}</span>
                            <span className="discount-label">(50% Child Discount)</span>
                          </>
                        ) : (
                          `₱${selectedBuilding.price}.00`
                        )}
                      </>
                    ) : '₱0.00'}
                  </span>
                </div>
              </div>
              
              <div className="ticket-barcode">
                <div className="barcode"></div>
                <div className="barcode-number">TKT-{Date.now().toString().slice(-8)}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="buildings-section">
          <h1 className="section-title">Select Facility to Access</h1>
          <p className="section-subtitle">Choose your destination and view access fee</p>
          
          <div className="buildings-grid">
            {facilities.map((facility) => {
              const Icon = facility.icon;
              const displayPrice = userData.age && userData.age < 12 ? 
                (facility.price * 0.5).toFixed(2) : facility.price.toFixed(2);
              return (
                <div
                  key={facility.id}
                  className={`building-card ${selectedBuilding?.id === facility.id ? 'selected' : ''}`}
                  onClick={() => handleBuildingSelect(facility)}
                  style={{ '--building-color': facility.color }}
                >
                  <Icon className="building-icon" />
                  <h3>{facility.name}</h3>
                  <div className="building-price">
                    {userData.age && userData.age < 12 ? (
                      <>
                        <span className="original-price">₱{facility.price}.00</span>
                        <span className="discounted-price">₱{displayPrice}</span>
                      </>
                    ) : (
                      `₱${facility.price}.00`
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <button
            className="payment-button"
            onClick={proceedToPayment}
            disabled={!selectedBuilding}
          >
            Proceed to Payment
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuildingSelection;
