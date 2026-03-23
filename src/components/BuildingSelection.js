import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRunning, FaBasketballBall, FaTableTennis, FaSwimmer, FaTint } from 'react-icons/fa';
import './BuildingSelection.css';

function BuildingSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showClubMemberOption, setShowClubMemberOption] = useState(false);
  const [isClubMember, setIsClubMember] = useState(null);

  const facilities = [
    { id: 1, name: 'Oval', icon: FaRunning, price: 20, color: '#4CAF50' },
    { id: 2, name: 'Basketball Gym/Kadasig Gym', icon: FaBasketballBall, price: 20, color: '#FF9800' },
    { id: 3, name: 'Badmintonnis Court', icon: FaTableTennis, price: 20, color: '#2196F3', hasClubOption: true },
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
      // For Badmintonnis Court, club member option is required
      if (selectedBuilding.hasClubOption && isClubMember === null) {
        alert('Please select whether you are a club member or not');
        return;
      }

      // Calculate price
      let finalPrice = selectedBuilding.price;
      let hasDiscount = false;
      let clubMemberDiscount = false;

      // Water Essence has no age discount
      if (selectedBuilding.noDiscount) {
        finalPrice = selectedBuilding.price; // Always 15
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
        <div className="info-sidebar">
          <div className="info-box">
            <div className="info-section">
              <span className="info-label">Age:</span>
              <span className="info-value">{userData.age || '-'}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Ticket #:</span>
              <span className="info-value">TKT-{Date.now().toString().slice(-8)}</span>
            </div>
            <div className="info-section">
              <span className="info-label">Price:</span>
              <span className="info-value price">
                {selectedBuilding ? (
                  <>
                    {selectedBuilding.noDiscount ? (
                      // Water Essence: always 15
                      <>₱{selectedBuilding.price.toFixed(2)}</>
                    ) : selectedBuilding.hasClubOption && isClubMember ? (
                      // Badmintonnis Court with club member: 50% off
                      <>
                        <span className="original-price">₱{selectedBuilding.price}.00</span>
                        <span className="discounted-price">₱{(selectedBuilding.price * 0.5).toFixed(2)}</span>
                      </>
                    ) : selectedBuilding.hasClubOption && isClubMember === false ? (
                      // Badmintonnis Court without club member: regular price
                      <>₱{selectedBuilding.price.toFixed(2)}</>
                    ) : !selectedBuilding.hasClubOption && userData.age && userData.age < 12 ? (
                      // Other facilities with age discount
                      <>
                        <span className="original-price">₱{selectedBuilding.price}.00</span>
                        <span className="discounted-price">₱{(selectedBuilding.price * 0.5).toFixed(2)}</span>
                      </>
                    ) : (
                      // Default price
                      <>₱{selectedBuilding.price.toFixed(2)}</>
                    )}
                  </>
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

              if (facility.noDiscount) {
                // Water Essence: always 15
                displayPrice = facility.price.toFixed(2);
              } else if (facility.hasClubOption && isClubMember) {
                // Badmintonnis Court with club member: 50% off
                displayPrice = (facility.price * 0.5).toFixed(2);
                showDiscount = true;
              } else if (!facility.hasClubOption && userData.age && userData.age < 12) {
                // Other facilities with age discount
                displayPrice = (facility.price * 0.5).toFixed(2);
                showDiscount = true;
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
                    {showDiscount ? (
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
  );
}

export default BuildingSelection;
