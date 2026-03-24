import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaRunning, FaBasketballBall, FaTableTennis, FaSwimmer, FaTint, FaArrowLeft } from 'react-icons/fa';
import './BuildingSelection.css';

function BuildingSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [showClubMemberOption, setShowClubMemberOption] = useState(false);
  const [isClubMember, setIsClubMember] = useState(null);
  const [showResidentOption, setShowResidentOption] = useState(false);
  const [isResident, setIsResident] = useState(null);

  const facilities = [
    { id: 1, name: 'Oval', icon: FaRunning, price: 20, color: '#4CAF50' },
    { id: 2, name: 'Basketball Gym/Kadasig Gym', icon: FaBasketballBall, price: 20, color: '#FF9800' },
    { id: 3, name: 'Badminton/Tennis Court', icon: FaTableTennis, price: 20, color: '#2196F3', hasClubOption: true },
    { id: 4, name: 'Swimming Pool', icon: FaSwimmer, price: 100, color: '#00BCD4' },
    { id: 5, name: 'Water Essence', icon: FaTint, residentPrice: 10, nonResidentPrice: 15, color: '#1E90FF', hasResidentOption: true, noDiscount: true }
  ];

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building);
    setIsClubMember(null); // Reset club member selection
    setIsResident(null); // Reset resident selection
    
    // Show club member option only for Badminton/Tennis Court
    if (building.hasClubOption) {
      setShowClubMemberOption(true);
      setShowResidentOption(false);
    } else if (building.hasResidentOption) {
      // Show resident option for Water Essence
      setShowResidentOption(true);
      setShowClubMemberOption(false);
    } else {
      setShowClubMemberOption(false);
      setShowResidentOption(false);
    }
  };

  const handleClubMemberSelection = (isClub) => {
    setIsClubMember(isClub);
  };

  const handleResidentSelection = (isRes) => {
    setIsResident(isRes);
  };

  const proceedToPayment = () => {
    if (selectedBuilding) {
      // For Badminton/Tennis Court, club member option is required (only for solo)
      if (userData.ticketType === 'solo' && selectedBuilding.hasClubOption && isClubMember === null) {
        alert('Please select whether you are a club member or not');
        return;
      }

      // For Water Essence, resident option is required (only for solo)
      if (userData.ticketType === 'solo' && selectedBuilding.hasResidentOption && isResident === null) {
        alert('Please select whether you are a campus resident or not');
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
        let residentDiscount = false;

        // Water Essence has resident pricing
        if (selectedBuilding.hasResidentOption) {
          finalPrice = isResident ? selectedBuilding.residentPrice : selectedBuilding.nonResidentPrice;
          residentDiscount = isResident;
        } else if (selectedBuilding.noDiscount) {
          finalPrice = selectedBuilding.price;
        } else if (selectedBuilding.hasClubOption && isClubMember) {
          // Badminton/Tennis Court: club member gets 50% off
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
          originalPrice: selectedBuilding.price || selectedBuilding.nonResidentPrice,
          hasDiscount: hasDiscount,
          clubMemberDiscount: clubMemberDiscount,
          isClubMember: isClubMember,
          isResident: isResident,
          residentDiscount: residentDiscount
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
    let pricePerPerson = building.price;

    if (building.hasResidentOption) {
      // Water Essence with resident pricing
      pricePerPerson = isResident ? building.residentPrice : building.nonResidentPrice;
      totalPrice = pricePerPerson * userData.totalPeople;
      priceBelow12 = pricePerPerson * userData.peopleBelow12;
      price12Above = pricePerPerson * userData.people12Above;
    } else if (building.noDiscount) {
      // Other no-discount facilities
      totalPrice = building.price * userData.totalPeople;
      priceBelow12 = building.price * userData.peopleBelow12;
      price12Above = building.price * userData.people12Above;
    } else {
      // Facilities with age discount: below 12 gets 50% off
      priceBelow12 = (building.price * 0.5) * userData.peopleBelow12;
      price12Above = building.price * userData.people12Above;
      totalPrice = priceBelow12 + price12Above;
    }

    return {
      totalPrice,
      priceBelow12,
      price12Above,
      pricePerPersonBelow12: building.hasResidentOption ? pricePerPerson : (building.noDiscount ? building.price : building.price * 0.5),
      pricePerPersonAbove12: building.hasResidentOption ? pricePerPerson : building.price
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
                      {selectedBuilding.hasResidentOption ? (
                        isResident !== null ? (
                          isResident ? (
                            <>₱{selectedBuilding.residentPrice.toFixed(2)} (Resident)</>
                          ) : (
                            <>₱{selectedBuilding.nonResidentPrice.toFixed(2)} (Non-Resident)</>
                          )
                        ) : (
                          <>₱{selectedBuilding.residentPrice} / ₱{selectedBuilding.nonResidentPrice}</>
                        )
                      ) : selectedBuilding.noDiscount ? (
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
                if (facility.hasResidentOption) {
                  // Water Essence with resident pricing
                  if (selectedBuilding?.id === facility.id && isResident !== null) {
                    displayPrice = isResident ? facility.residentPrice.toFixed(2) : facility.nonResidentPrice.toFixed(2);
                  } else {
                    displayPrice = `${facility.residentPrice}/${facility.nonResidentPrice}`;
                  }
                } else if (facility.noDiscount) {
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
                        <div className="price-per-unit">
                          {facility.hasResidentOption ? (
                            isResident !== null ? (
                              <>₱{(isResident ? facility.residentPrice : facility.nonResidentPrice)}/person</>
                            ) : (
                              <>₱10/15 per person</>
                            )
                          ) : (
                            <>₱{facility.price}.00/person</>
                          )}
                        </div>
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
                          `₱${typeof displayPrice === 'number' ? displayPrice.toFixed(2) : displayPrice}`
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Club Member Option for Badminton/Tennis Court */}
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

          {/* Resident Option for Water Essence */}
          {showResidentOption && selectedBuilding?.hasResidentOption && (
            <div className="club-member-option">
              <h3>Are you a campus resident?</h3>
              <div className="club-option-buttons">
                <button
                  className={`club-btn ${isResident === true ? 'active' : ''}`}
                  onClick={() => handleResidentSelection(true)}
                >
                  Yes, Campus Resident (₱{selectedBuilding.residentPrice})
                </button>
                <button
                  className={`club-btn ${isResident === false ? 'active' : ''}`}
                  onClick={() => handleResidentSelection(false)}
                >
                  No, Non-Resident (₱{selectedBuilding.nonResidentPrice})
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
              disabled={!selectedBuilding || (selectedBuilding?.hasClubOption && isClubMember === null) || (selectedBuilding?.hasResidentOption && isResident === null)}
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
