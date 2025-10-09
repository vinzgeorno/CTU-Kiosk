import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaIdCard, FaUserCircle } from 'react-icons/fa';
import './LandingPage.css';

function LandingPage({ userData, setUserData }) {
  const navigate = useNavigate();

  const handleIDChoice = (hasID) => {
    setUserData({ ...userData, hasID });
    navigate('/camera');
  };

  return (
    <div className="landing-page fade-in">
      <div className="landing-container">
        <div className="campus-logo">
          <img src={require('../images/campus_logo.png')} alt="Campus Logo" />
        </div>
        <h1 className="landing-title">Welcome to Campus Facility Access System</h1>
        <p className="landing-subtitle">Please select how you would like to proceed</p>
        
        <div className="choice-cards">
          <div className="choice-card" onClick={() => handleIDChoice(true)}>
            <FaIdCard className="choice-icon" />
            <h2>I have an ID</h2>
            <p>Scan your ID card to proceed</p>
          </div>
          
          <div className="choice-card" onClick={() => handleIDChoice(false)}>
            <FaUserCircle className="choice-icon" />
            <h2>I don't have an ID</h2>
            <p>Use facial recognition and enter name manually</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
