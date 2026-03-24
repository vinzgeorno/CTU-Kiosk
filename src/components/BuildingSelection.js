import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRunning, FaBasketballBall, FaTableTennis, FaSwimmer, FaTint, FaArrowLeft } from 'react-icons/fa';
import './BuildingSelection.css';

function BuildingSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showClubMemberOption, setShowClubMemberOption] = useState(false);
  const [isClubMember, setIsClubMember] = useState(null);

  const facilities = [
    { id: 1, name: 'Oval', icon: FaRunning, price: 20, color: '#4CAF50' },
    { id: 2, name: 'Basketball Gym/Kadasig Gym', icon: FaBasketballBall, price: 20, color: '#FF9800' },
    { id: 3, name: 'Badminton/Tennis Court', icon: FaTableTennis, price: 20, color: '#2196F3', hasClubOption: true },
    { id: 4, name: 'Swimming Pool', icon: FaSwimmer, price: 100, color: '#00BCD4' },
    { id: 5, name: 'Water Essence', icon: FaTint, price: 15, color: '#1E90FF', noDiscount: true }
  ];

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setIsClubMember(null); // Reset club member selection
    
    // Show club member option only for Badmintonnis Court
    if (building.hasClubOption) {
      setShowClubMemberOption(true);
    } else {
      setShowClubMemberOption(false);
    }
  };

  const handleClubMemberSelection = (isClub) => {
    setIsClubMember(isClub);
  };

  const proceedToPayment = () => {
    if (selectedBuilding) {
      // For Badmintonnis Court, club member option is required (only for solo)
      if (userData.ticketType === 'solo' && selectedBuilding.hasClubOption && isClubMember === null) {
        alert('Please select whether you are a club member or not');
        return;
      }

      if (userData.ticketType === 'bulk') {
        // Bulk purchase pricing
        const bulkPricing = calculateBulkPrice(selectedBuilding);
        
        setUserData({
          ...userData,
          selectedBuilding: selectedBuilding,
          ticketPrice: bulkPricing.totalPrice,
          originalPrice: selectedBuilding.price,
          hasDiscount: userData.peopleBelow12 > 0 && !selectedBuilding.noDiscount,
          bulkPricing: bulkPricing
        });
      } else {
        // Solo purchase pricing
        let finalPrice = selectedBuilding.price;
        let hasDiscount = false;
        let clubMemberDiscount = false;

        // Water Essence has no age discount
        if (selectedBuilding.noDiscount) {
          finalPrice = selectedBuilding.price;
        } else if (selectedBuilding.hasClubOption && isClubMember) {
          // Badmintonnis Court: club member gets 50% off
          finalPrice = selectedBuilding.price * 0.5;
          clubMemberDiscount = true;
        } else if (!selectedBuilding.hasClubOption && userData.age && userData.age < 12) {
          // Other facilities: age discount for under 12
          finalPrice = selectedBuilding.price * 0.5;
          hasDiscount = true;
        }
        
        setUserData({
          ...userData,
          selectedBuilding: selectedBuilding,
          ticketPrice: finalPrice,
          originalPrice: selectedBuilding.price,
          hasDiscount: hasDiscount,
          clubMemberDiscount: clubMemberDiscount,
          isClubMember: isClubMember
        });
      }
      
      navigate('/payment');
    }
  };

  const handleBack = () => {
    if (userData.ticketType === 'bulk') {
      navigate('/ticket-type');
    } else {
      navigate('/age-selection');
    }
  };

  const calculateBulkPrice = (building) => {
    if (userData.ticketType !== 'bulk') return null;

    let totalPrice = 0;
    let priceBelow12 = 0;
    let price12Above = 0;

    if (building.noDiscount) {
      // Water Essence: no discount for anyone
      totalPrice = building.price * userData.totalPeople;
      priceBelow12 = building.price * userData.peopleBelow12;
      price12Above = building.price * userData.people12Above;
    } else {
      // Other facilities: below 12 gets 50% off
      priceBelow12 = (building.price * 0.5) * userData.peopleBelow12;
      price12Above = building.price * userData.people12Above;
      totalPrice = priceBelow12 + price12Above;
    }

    return {
      totalPrice,
      priceBelow12,
      price12Above,
      pricePerPersonBelow12: building.noDiscount ? building.price : building.price * 0.5,
      pricePerPersonAbove12: building.price
    };
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
        <div className="info-sidebar">
          <div className="info-box">
            {userData.ticketType === 'bulk' ? (
              <>
                <div className="info-section">
                  <span className="info-label">Ticket Type:</span>
                  <span className="info-value">Bulk Purchase</span>
                </div>
                <div className="info-section">
                  <span className="info-label">Total People:</span>
                  <span className="info-value">{userData.totalPeople}</span>
                </div>
                <div className="info-section">
                  <span className="info-label">Below 12:</span>
                  <span className="info-value">{userData.peopleBelow12}</span>
                </div>
                <div className="info-section">
                  <span className="info-label">12 & Above:</span>
                  <span className="info-value">{userData.people12Above}</span>
                </div>
              </>
            ) : (
              <>
                <div className="info-section">
                  <span className="info-label">Category:</span>
                  <span className="info-value">{userData.ageGroup || '-'}</span>
                </div>
                <div className="info-section">
                  <span className="info-label">Ticket #:</span>
                  <span className="info-value">{userData.transactionId || '-'}</span>
                </div>
              </>
            )}
            <div className="info-section">
              <span className="info-label">Ticket #:</span>
              <span className="info-value">{userData.transactionId || '-'}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Price:</span>
              <span className="info-value price">
                {selectedBuilding ? (
                  userData.ticketType === 'bulk' ? (
                    <>
                      <div className="bulk-price-breakdown">
                        {userData.peopleBelow12 > 0 && (
                          <div className="price-line">
                            <span>{userData.peopleBelow12}x₱{calculateBulkPrice(selectedBuilding).pricePerPersonBelow12.toFixed(2)}</span>
                            <span>₱{calculateBulkPrice(selectedBuilding).priceBelow12.toFixed(2)}</span>
                          </div>
                        )}
                        {userData.people12Above > 0 && (
                          <div className="price-line">
                            <span>{userData.people12Above}x₱{calculateBulkPrice(selectedBuilding).pricePerPersonAbove12.toFixed(2)}</span>
                            <span>₱{calculateBulkPrice(selectedBuilding).price12Above.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="price-line total">
                          <span>Total:</span>
                          <span>₱{calculateBulkPrice(selectedBuilding).totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedBuilding.noDiscount ? (
                        <>₱{selectedBuilding.price.toFixed(2)}</>
                      ) : selectedBuilding.hasClubOption && isClubMember ? (
                        <>
                          <span className="original-price">₱{selectedBuilding.price}.00</span>
                          <span className="discounted-price">₱{(selectedBuilding.price * 0.5).toFixed(2)}</span>
                        </>
                      ) : selectedBuilding.hasClubOption && isClubMember === false ? (
                        <>₱{selectedBuilding.price.toFixed(2)}</>
                      ) : !selectedBuilding.hasClubOption && userData.age && userData.age < 12 ? (
                        <>
                          <span className="original-price">₱{selectedBuilding.price}.00</span>
                          <span className="discounted-price">₱{(selectedBuilding.price * 0.5).toFixed(2)}</span>
                        </>
                      ) : (
                        <>₱{selectedBuilding.price.toFixed(2)}</>
                      )}
                    </>
                  )
                ) : '0.00 ₱'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="buildings-section">
          <h1 className="section-title">Select Facility to Access</h1>
          <p className="section-subtitle">Choose your destination and view access fee</p>
          
          <div className="buildings-grid">
            {facilities.map((facility) => {
              const Icon = facility.icon;
              let displayPrice = facility.price.toFixed(2);
              let showDiscount = false;
              let bulkDisplayPrice = null;

              if (userData.ticketType === 'bulk') {
                // For bulk, calculate and display total price
                const bulkPricing = calculateBulkPrice(facility);
                bulkDisplayPrice = bulkPricing.totalPrice.toFixed(2);
              } else {
                // For solo, use existing logic
                if (facility.noDiscount) {
                  displayPrice = facility.price.toFixed(2);
                } else if (facility.hasClubOption && isClubMember) {
                  displayPrice = (facility.price * 0.5).toFixed(2);
                  showDiscount = true;
                } else if (!facility.hasClubOption && userData.age && userData.age < 12) {
                  displayPrice = (facility.price * 0.5).toFixed(2);
                  showDiscount = true;
                }
              }

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
                    {userData.ticketType === 'bulk' ? (
                      <div className="bulk-price-display">
                        <div className="price-per-unit">₱{facility.price}.00/person</div>
                        <div className="total-price">₱{bulkDisplayPrice} total</div>
                      </div>
                    ) : (
                      <>
                        {showDiscount ? (
                          <>
                            <span className="original-price">₱{facility.price}.00</span>
                            <span className="discounted-price">₱{displayPrice}</span>
                          </>
                        ) : (
                          `₱${facility.price}.00`
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Club Member Option for Badmintonnis Court */}
          {showClubMemberOption && selectedBuilding?.hasClubOption && (
            <div className="club-member-option">
              <h3>Are you a club member?</h3>
              <div className="club-option-buttons">
                <button
                  className={`club-btn ${isClubMember === true ? 'active' : ''}`}
                  onClick={() => handleClubMemberSelection(true)}
                >
                  Yes, Club Member
                </button>
                <button
                  className={`club-btn ${isClubMember === false ? 'active' : ''}`}
                  onClick={() => handleClubMemberSelection(false)}
                >
                  No, Regular User
                </button>
              </div>
            </div>
          )}
          
          <div className="building-controls">
            <button onClick={handleBack} className="back-button">
              <FaArrowLeft /> Back
            </button>
            <button
              className="payment-button"
              onClick={proceedToPayment}
              disabled={!selectedBuilding || (selectedBuilding?.hasClubOption && isClubMember === null)}
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuildingSelection;
