import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Search, AlertCircle,
    Shield, BarChart3, Activity, ScrollText
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
    // Simulated live signal activity
    const [signals, setSignals] = useState([true, true, true, true]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSignals(prev => prev.map(() => Math.random() > 0.3));
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="sidebar">
            <div className="sidebar-logo" style={{ marginBottom: '3rem', padding: '1rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Shield size={24} className="text-primary" />
                    <span style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.1em', fontFamily: "'Inter', sans-serif" }}>VECTOR</span>
                </div>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.06em', lineHeight: 1.5, paddingLeft: '0.1rem' }}>
                    Velocity Engine for Critical<br />Transaction &amp; Observation Risk
                </span>
            </div>

            <div className="sidebar-section">CORE_OPS</div>
            <nav className="sidebar-nav">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <LayoutDashboard size={16} />
                    <span>Overwatch</span>
                </NavLink>

                <NavLink to="/queue" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <AlertCircle size={16} />
                    <span>Crisis Dispatch</span>
                </NavLink>

                <NavLink to="/search" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <Search size={16} />
                    <span>Loan Account Audit</span>
                </NavLink>
            </nav>

            <div className="sidebar-section" style={{ marginTop: '2.5rem' }}>FLEET_SYSTEMS</div>
            <nav className="sidebar-nav">
                <NavLink to="/fleet" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <BarChart3 size={16} />
                    <span>Observatory</span>
                </NavLink>

            </nav>

            <div className="sidebar-section" style={{ marginTop: '2.5rem' }}>AUDIT_SYSTEMS</div>
            <nav className="sidebar-nav">
                <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ScrollText size={16} />
                    <span>Transaction Ledger</span>
                </NavLink>
            </nav>

            <div className="sidebar-footer">
                <div className="engine-status">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div className="status-indicator">
                                <div className="pulse-dot"></div>
                                <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 800 }}>SYNC_STABLE</span>
                            </div>
                            <span className="mono text-dim" style={{ fontSize: '0.55rem' }}>V.4.0.2</span>
                        </div>

                        <div className="activity-matrix">
                            <div className="matrix-label mono">SIGNAL_ACTIVITY</div>
                            <div className="matrix-grid">
                                {signals.map((active, i) => (
                                    <div key={i} className={`matrix-cell ${active ? 'active' : ''}`}></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
