import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mockCustomers } from '../data/mockData';

const RealTimeTicker = () => {
  const [index, setIndex] = useState(0);
  const tickers = mockCustomers.map(c => ({
    name: c.name,
    id: c.id,
    risk: (c.risk * 100).toFixed(1),
    change: c.riskChange,
    up: c.riskChange.startsWith('+')
  }));

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % tickers.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [tickers.length]);

  const current = tickers[index];

  return (
    <div className="ticker-container">
      <div className="ticker-label mono">
        KINETIC_TAPE
      </div>
      <div className="ticker-viewport">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="ticker-entry mono"
          >
            <div className="ticker-item">
              <span className="label">ENTITY_ID:</span>
              <span className="value text-primary">{current.id}</span>
            </div>
            <div className="ticker-item">
              <span className="label">NAME:</span>
              <span className="value" style={{ color: '#fff', fontWeight: 800 }}>{current.name.toUpperCase()}</span>
            </div>
            <div className="ticker-item">
              <span className="label">SCORE:</span>
              <span className="value" style={{ fontWeight: 800 }}>{current.risk}%</span>
              <span className={`value ${current.up ? 'text-red' : 'text-green'}`} style={{ marginLeft: '0.5rem' }}>
                {current.up ? '▲' : '▼'} {current.change}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="ticker-meta mono">
        SCAN_RATE: 4.2K/S • STATUS: OPTIMAL
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .ticker-container {
          background: #010409;
          border-bottom: 1px solid var(--border);
          height: 36px;
          display: flex;
          align-items: center;
          padding: 0 1.5rem;
          position: sticky;
          top: 0;
          z-index: 1000;
          margin: -2.5rem -3.5rem 2.5rem -3.5rem;
        }
        .ticker-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          width: 120px;
          border-right: 1px solid var(--border);
          height: 100%;
          display: flex;
          align-items: center;
        }
        .ticker-viewport {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          padding: 0 2rem;
          overflow: hidden;
        }
        .ticker-entry {
          display: flex;
          align-items: center;
          gap: 3rem;
        }
        .ticker-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }
        .ticker-item .label {
            font-size: 0.6rem;
            color: var(--text-dim);
            letter-spacing: 0.05em;
        }
        .ticker-item .value {
            font-size: 0.75rem;
        }
        .ticker-meta {
          font-size: 0.6rem;
          color: var(--text-dim);
          border-left: 1px solid var(--border);
          height: 100%;
          display: flex;
          align-items: center;
          padding-left: 2rem;
        }
      `}} />
    </div>
  );
};

export default RealTimeTicker;
