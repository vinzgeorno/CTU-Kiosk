import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaUsers, FaArrowLeft } from 'react-icons/fa';
import './TicketTypeSelection.css';

function TicketTypeSelection({ userData, setUserData }) {
  const navigate = useNavigate();
  const [ticketType, setTicketType] = useState(null);
  const [totalPeople, setTotalPeople] = useState('');
  const [peopleBelow12, setPeopleBelow12] = useState('');
  const [people12Above, setPeople12Above] = useState('');

  const handleSolo = () => {
    // Generate transaction ID for solo
    const transactionId = 'TKT-' + Date.now();
    
    setUserData({
      ...userData,
      transactionId: transactionId,
      ticketType: 'solo'
    });
    navigate('/age-selection');
  };

  const handleBulkProceed = () => {
    const total = parseInt(totalPeople);
    const below12 = parseInt(peopleBelow12);
    const above12 = parseInt(people12Above);

    // Validation
    if (!totalPeople || !peopleBelow12 || !people12Above) {
      alert('Please fill in all fields');
      return;
    }

    if (below12 + above12 !== total) {
      alert(`The sum of people below 12 (${below12}) and 12 & above (${above12}) must equal total people (${total})`);
      return;
    }

    if (below12 < 0 || above12 < 0 || total < 1) {
      alert('Please enter valid positive numbers');
      return;
    }

    // Generate transaction ID for bulk
    const transactionId = 'TKT-' + Date.now();

    setUserData({
      ...userData,
      transactionId: transactionId,
      ticketType: 'bulk',
      totalPeople: total,
      peopleBelow12: below12,
      people12Above: above12
    });
    navigate('/building-selection');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="ticket-type-selection fade-in">
      <div className="selection-container">
        <div className="card">
          <h1>Select Ticket Type</h1>
          <p>Choose how you want to purchase tickets</p>

          {!ticketType && (
            <div className="type-buttons-container">
              <button
                onClick={() => setTicketType('solo')}
                className="type-button solo"
              >
                <FaUser className="type-icon" />
                <span className="type-label">Solo</span>
                <span className="type-info">Single visitor ticket</span>
              </button>

              <button
                onClick={() => setTicketType('bulk')}
                className="type-button bulk"
              >
                <FaUsers className="type-icon" />
                <span className="type-label">Bulk</span>
                <span className="type-info">Multiple visitors</span>
              </button>
            </div>
          )}

          {ticketType === 'solo' && (
            <div className="confirmation-section">
              <div className="confirmation-box">
                <div className="confirmation-icon">
                  <FaUser />
                </div>
                <h2>Solo Ticket</h2>
                <p>You are purchasing a single visitor ticket</p>
              </div>

              <div className="control-buttons">
                <button onClick={() => setTicketType(null)} className="back-type-button">
                  Change Selection
                </button>
                <button onClick={handleSolo} className="confirm-button">
                  Proceed
                </button>
              </div>
            </div>
          )}

          {ticketType === 'bulk' && (
            <div className="bulk-form-section">
              <h2>Bulk Ticket Purchase</h2>

              <div className="form-group">
                <label htmlFor="totalPeople">Total Number of People *</label>
                <input
                  type="number"
                  id="totalPeople"
                  value={totalPeople}
                  onChange={(e) => setTotalPeople(e.target.value)}
                  placeholder="Enter total number of people"
                  min="1"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="peopleBelow12">Below 12 Years Old *</label>
                  <input
                    type="number"
                    id="peopleBelow12"
                    value={peopleBelow12}
                    onChange={(e) => setPeopleBelow12(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="people12Above">12 Years & Above *</label>
                  <input
                    type="number"
                    id="people12Above"
                    value={people12Above}
                    onChange={(e) => setPeople12Above(e.target.value)}
                    placeholder="0"
                    min="0"
                    className="form-input"
                  />
                </div>
              </div>

              {totalPeople && peopleBelow12 && people12Above && (
                <div className="summary-box">
                  <h3>Summary</h3>
                  <div className="summary-item">
                    <span>Total People:</span>
                    <span className="summary-value">{totalPeople}</span>
                  </div>
                  <div className="summary-item">
                    <span>Below 12 (50% off):</span>
                    <span className="summary-value">{peopleBelow12}</span>
                  </div>
                  <div className="summary-item">
                    <span>12 & Above:</span>
                    <span className="summary-value">{people12Above}</span>
                  </div>
                </div>
              )}

              <div className="control-buttons">
                <button onClick={() => setTicketType(null)} className="back-type-button">
                  Back
                </button>
                <button onClick={handleBulkProceed} className="confirm-button">
                  Proceed to Facility
                </button>
              </div>
            </div>
          )}

          <div className="navigation-buttons">
            <button onClick={handleBack} className="back-button-main">
              <FaArrowLeft /> Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TicketTypeSelection;
