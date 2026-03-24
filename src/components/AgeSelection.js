import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import './AgeSelection.css';

function AgeSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [ageGroup, setAgeGroup] = useState(userData.ageGroup || null);
  const [ageValue, setAgeValue] = useState(userData.age || null);

  const handleAgeSelection = (group, value) => {
    setAgeGroup(group);
    setAgeValue(value);
  };

  const handleNext = () => {
    if (ageGroup && ageValue !== null) {
      // Use existing transaction ID from TicketTypeSelection or create new one if needed
      const transactionId = userData.transactionId || 'TKT-' + Date.now();
      
      setUserData({
        ...userData,
        name: 'Guest',
        ageGroup: ageGroup,
        age: ageValue,
        transactionId: transactionId
      });
      navigate('/building-selection');
    }
  };

  const handleBack = () => {
    navigate('/ticket-type');
  };

  return (
    <div className="age-selection fade-in">
      <div className="selection-container">
        <div className="form-card">
          <h1>Visitor Information</h1>
          <p>Please select your age group to proceed</p>

          <div className="age-buttons-container">
            <button
              onClick={() => handleAgeSelection('11 and below', 11)}
              className={`age-button ${ageGroup === '11 and below' ? 'selected' : ''}`}
            >
              <span className="age-button-label">11 and Below</span>
              <span className="age-button-info">Get 50% Discount</span>
            </button>
            
            <button
              onClick={() => handleAgeSelection('12 and above', 12)}
              className={`age-button ${ageGroup === '12 and above' ? 'selected' : ''}`}
            >
              <span className="age-button-label">12 and Above</span>
              <span className="age-button-info">Regular Price</span>
            </button>
          </div>

          <div className="button-controls">
            <button onClick={handleBack} className="back-button">
              <FaArrowLeft /> Back
            </button>
            <button 
              onClick={handleNext} 
              disabled={!ageGroup}
              className="next-button"
            >
              Next <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgeSelection;
