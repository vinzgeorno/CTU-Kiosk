import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import './AgeSelection.css';

function AgeSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [age, setAge] = useState(userData.age || '');

  const handleProceed = () => {
    if (age) {
      setUserData({
        ...userData,
        name: 'Guest',
        age: parseInt(age)
      });
      navigate('/building-selection');
    }
  };

  const ageOptions = Array.from({ length: 100 }, (_, i) => i);

  return (
    <div className="age-selection fade-in">
      <div className="selection-container">
        <div className="form-card">
          <h1>Visitor Information</h1>
          <p>Please select your age to proceed</p>

          <div className="form-group">
            <label htmlFor="age">Age *</label>
            <select
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="form-input"
            >
              <option value="">Select your age</option>
              {ageOptions.map((option) => (
                <option key={option} value={option}>
                  {option} years old
                </option>
              ))}
            </select>
          </div>

          {age && age < 12 && (
            <p className="verification-warning">⚠️ Below 12 users have to present their ticket to the men in charge for verification.</p>
          )}

          <button
            onClick={handleProceed}
            disabled={!age}
            className="proceed-button"
          >
            <FaArrowRight /> Continue to Facilities
          </button>
        </div>
      </div>
    </div>
  );
}

export default AgeSelection;
