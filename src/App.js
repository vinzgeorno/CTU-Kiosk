import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import TicketTypeSelection from './components/TicketTypeSelection';
import AgeSelection from './components/AgeSelection';
import BuildingSelection from './components/BuildingSelection';
import PaymentPage from './components/PaymentPage';
import TicketComplete from './components/TicketComplete';
import DatabaseViewer from './components/DatabaseViewer';
import SyncManager from './components/SyncManager';
import DeviceManagement from './components/DeviceManagement';
import './App.css';
import './kiosk.css';

function App() {
  const [userData, setUserData] = useState({
    name: '',
    age: null,
    selectedBuilding: null,
    ticketPrice: 0,
    transactionId: null
  });

  return (
    <Router>
      <div className="App kiosk-mode">
        <Routes>
          <Route path="/" element={<LandingPage userData={userData} setUserData={setUserData} />} />
          <Route path="/ticket-type" element={<TicketTypeSelection userData={userData} setUserData={setUserData} />} />
          <Route path="/age-selection" element={<AgeSelection userData={userData} setUserData={setUserData} />} />
          <Route path="/building-selection" element={<BuildingSelection userData={userData} setUserData={setUserData} />} />
          <Route path="/payment" element={<PaymentPage userData={userData} setUserData={setUserData} />} />
          <Route path="/ticket-complete" element={<TicketComplete userData={userData} setUserData={setUserData} />} />
          <Route path="/admin/database" element={<DatabaseViewer />} />
          <Route path="/admin/sync" element={<SyncManager />} />
          <Route path="/admin/devices" element={<DeviceManagement />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
