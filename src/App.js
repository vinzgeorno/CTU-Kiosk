import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import CameraCapture from './components/CameraCapture';
import BuildingSelection from './components/BuildingSelection';
import PaymentPage from './components/PaymentPage';
import TicketComplete from './components/TicketComplete';
import './App.css';

function App() {
  const [userData, setUserData] = useState({
    hasID: null,
    name: '',
    capturedImage: null,
    selectedBuilding: null,
    ticketPrice: 0,
    transactionId: null
  });

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage userData={userData} setUserData={setUserData} />} />
          <Route path="/camera" element={<CameraCapture userData={userData} setUserData={setUserData} />} />
          <Route path="/building-selection" element={<BuildingSelection userData={userData} setUserData={setUserData} />} />
          <Route path="/payment" element={<PaymentPage userData={userData} setUserData={setUserData} />} />
          <Route path="/ticket-complete" element={<TicketComplete userData={userData} setUserData={setUserData} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
