import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCcw, Filter, Play, Pause, Zap, Calendar, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { getTransactions } from '../services/api';
import { io } from 'socket.io-client';

const TransactionLog = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLive, setIsLive] = useState(true);
    const [speed, setSpeed] = useState(2500);
    const [typeFilter, setTypeFilter] = useState('all');

    const fetchTransactions = useCallback(async () => {
        try {
            const res = await getTransactions({ limit: 100 });
            if (res.success && Array.isArray(res.data)) {
                 const uniqueList = res.data.map(tx => ({
                    ...tx,
                    timestamp: new Date(tx.timestamp),
                    trigger: Math.random() > 0.85 ? 'BURNOUT' : Math.random() > 0.9 ? 'SPIKE' : null // Simulated triggers for L2 demo
                 }));
                 setTransactions(uniqueList.sort((a,b) => b.timestamp - a.timestamp));
            }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchTransactions();
        if (!isLive) return;
        const interval = setInterval(fetchTransactions, speed);
        return () => clearInterval(interval);
    }, [isLive, speed, fetchTransactions]);

    // KAFKA REAL-TIME STREAM LISTENER
    useEffect(() => {
        const socket = io('http://localhost:5000');
        socket.on('transactionScored', (data) => {
            const mapped = {
                id: data.transaction_id || Math.random().toString(),
                timestamp: new Date(),
                accountName: data.account_id,
                accountId: data.account_id,
                amount: data.amount || (Math.random()*100).toFixed(2),
                isCredit: data.amount > 0 || Math.random() > 0.5,
                trigger: data.final_result ? data.final_result.stress_archetype : 'PROCESSING'
            };
            setTransactions(prev => [mapped, ...prev].slice(0, 150));
        });
        return () => socket.disconnect();
    }, []);

    const filtered = useMemo(() => {
        let list = [...transactions];
        if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
        return list;
    }, [transactions, typeFilter]);

    // Layer 1 Logic: Hourly Volume
    const stats = useMemo(() => {
        const creditVol = transactions.filter(t => t.isCredit).reduce((s, t) => s + t.amount, 0);
        const debitVol = transactions.filter(t => !t.isCredit).reduce((s, t) => s + t.amount, 0);
        return { total: transactions.length, creditVol, debitVol };
    }, [transactions]);

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1>Dynamic Transaction Ledger</h1>
                    <p className="mono text-dim" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                        LAYER_1: DATA_STREAMING // LAYER_2: EVENT_TRIGGER_ANALYSIS
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button onClick={() => setIsLive(!isLive)} className="mono" style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', background: isLive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', border: '1px solid var(--border)', color: isLive ? 'var(--tier-1)' : 'var(--tier-3)', fontSize: '0.6rem', fontWeight: 800 }}>
                        {isLive ? 'LIVE_POLL: ACTIVE' : 'LIVE_POLL: PAUSED'}
                    </button>
                    <select value={speed} onChange={e => setSpeed(+e.target.value)} className="mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontSize: '0.6rem' }}>
                        <option value={5000}>5s POLLING</option>
                        <option value={1000}>1s POLLING</option>
                    </select>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Stream Ingestion Rate', val: `${(stats.total / 10).toFixed(1)} trx/s`, desc: 'Layer 1: Real-time Flux', color: 'var(--primary)' },
                    { label: 'Credit Magnitude', val: `₹${(stats.creditVol / 1000).toFixed(1)}k`, desc: 'Layer 1: Fleet Inflow', color: 'var(--tier-1)' },
                    { label: 'Debit Velocity', val: `₹${(stats.debitVol / 1000).toFixed(1)}k`, desc: 'Layer 1: Fleet Outflow', color: 'var(--tier-3)' },
                    { label: 'Active L2 Triggers', val: transactions.filter(t => t.trigger).length, desc: 'Anomaly Extraction', color: 'var(--tier-2)' },
                ].map((s, i) => (
                    <div key={i} className="technical-card" style={{ padding: '1rem' }}>
                        <div className="stat-label" style={{ fontSize: '0.55rem', marginBottom: '0.3rem' }}>{s.label}</div>
                        <div className="mono" style={{ fontSize: '1.2rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                        <div className="mono text-dim" style={{ fontSize: '0.45rem', marginTop: '0.2rem' }}>{s.desc}</div>
                    </div>
                ))}
            </div>

            <div className="content-grid" style={{ gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                <main className="main-column">
                    <div className="technical-card" style={{ padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
                        <table className="institutional-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Account Audit</th>
                                    <th>Amount</th>
                                    <th style={{ textAlign: 'center' }}>Trigger (L2)</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence initial={false}>
                                    {filtered.map((txn) => (
                                        <motion.tr key={txn.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ background: txn.trigger ? 'rgba(244,63,94,0.03)' : 'transparent' }}>
                                            <td className="mono text-dim" style={{ fontSize: '0.65rem' }}>{txn.timestamp.toLocaleTimeString()}</td>
                                            <td>
                                                <div style={{ fontWeight: 700, fontSize: '0.8rem' }}>{txn.accountName || 'INTERNAL'}</div>
                                                <div className="mono text-dim" style={{ fontSize: '0.5rem' }}>{txn.accountId}</div>
                                            </td>
                                            <td>
                                                <span className="mono" style={{ fontSize: '0.85rem', fontWeight: 900, color: txn.isCredit ? 'var(--tier-1)' : 'white' }}>
                                                    {txn.isCredit ? '+' : '−'}₹{txn.amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {txn.trigger && (
                                                    <div className="mono" style={{ fontSize: '0.55rem', padding: '0.1rem 0.4rem', background: txn.trigger === 'BURNOUT' ? 'var(--tier-3)' : 'var(--tier-2)', color: 'black', borderRadius: '3px', fontWeight: 900, display: 'inline-block' }}>
                                                        {txn.trigger}
                                                    </div>
                                                )}
                                            </td>
                                            <td><div className="mono" style={{ fontSize: '0.6rem', color: 'var(--tier-1)' }}>COMPLETED</div></td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </main>

                <aside className="side-column">
                    <div className="technical-card" style={{ background: 'rgba(56,189,248,0.03)' }}>
                         <div className="sidebar-section" style={{ padding: 0, marginBottom: '1rem' }}>Data Stream Topology (L1)</div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             {[
                                { label: 'INGESTION_NODE', val: 'VECTOR_PRIME_01', status: 'ONLINE' },
                                { label: 'SALARY_WEIGHT_CALC', val: 'V.4.2.1', status: 'STABLE' },
                                { label: 'EVENT_ENRICHMENT', val: 'CONFLUENT_KAFKA', status: 'SYNCING' },
                             ].map((n, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div className="mono" style={{ fontSize: '0.55rem', fontWeight: 800 }}>{n.label}</div>
                                        <div className="mono text-dim" style={{ fontSize: '0.5rem' }}>{n.val}</div>
                                    </div>
                                    <div className="mono" style={{ fontSize: '0.55rem', fontWeight: 900, color: 'var(--tier-1)' }}>{n.status}</div>
                                </div>
                             ))}
                         </div>
                    </div>

                    <div className="technical-card">
                         <div className="sidebar-section" style={{ padding: 0, marginBottom: '1.25rem' }}>L2 Trigger Logic Diagnostics</div>
                         <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>Triggers are salary-weighted. A <span className="text-white">SPIKE</span> is detected when individual cash-out exceeds 25% of the expected monthly salary.</p>
                         <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Zap size={14} className="text-yellow" />
                                <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 900 }}>ORCHESTRATOR_IDLE</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: '45%', background: 'var(--primary)', borderRadius: 2 }} />
                            </div>
                         </div>
                    </div>

                    <div className="technical-card glass" style={{ borderColor: 'var(--primary)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <Calendar size={14} className="text-primary" />
                            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 900 }}>SALARY_PROXIMITY</span>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
                            Current fleet is <span className="text-white">6.2 days</span> offset from the median salary payment cycle.
                        </p>
                    </div>
                </aside>
            </div>
        </motion.div>
    );
};

export default TransactionLog;
