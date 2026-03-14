import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage({ userData, setUserData }) {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/age-selection');
  };

  return (
    <div className="landing-page fade-in">
      <div className="landing-container">
        <div className="welcome-content">
          <h1 className="welcome-title">Welcome to Cebu Technological University - Danao Campus Ticket Machine</h1>
          
          <p className="terms-agreement">By using this machine, you agree to the Terms and Conditions</p>

          <button 
            onClick={handleStart}
            className="start-button"
          >
            <FaPlay /> START
          </button>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
