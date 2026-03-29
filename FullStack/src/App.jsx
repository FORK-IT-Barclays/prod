import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InterventionQueue from './pages/InterventionQueue';
import CustomerSearch from './pages/CustomerSearch';
import FleetAnalytics from './pages/FleetAnalytics';

import TransactionLog from './pages/TransactionLog';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/queue" element={<InterventionQueue />} />
            <Route path="/search" element={<CustomerSearch />} />
            <Route path="/fleet" element={<FleetAnalytics />} />

            <Route path="/transactions" element={<TransactionLog />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
