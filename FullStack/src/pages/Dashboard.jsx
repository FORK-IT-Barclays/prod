import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Info, ShieldCheck, AlertTriangle, TrendingUp, Users, DollarSign, Target, RefreshCcw, Zap, Clock } from 'lucide-react';
import { getAccounts, getPortfolioStats, getLatestBatch } from '../services/api';
import '../App.css';

// --- helpers --- //
const signalNames = { s1: 'PAY_DRIFT', s2: 'LIQUIDITY', s3: 'EXHAUSTION', s4: 'SPEND_VEL', s5: 'APP_DECAY', s6: 'EXTERNAL', s7: 'CASH_SHIFT', s8: 'FAILURE' };

const Dashboard = () => {
    const [timeRange, setTimeRange] = useState(30);

    // ── Live data state ──────────────────────────────────────────────
    const [accounts, setAccounts] = useState([]);
    const [portfolioApi, setPortfolioApi] = useState(null);
    const [latestBatch, setLatestBatch] = useState(null);
    const [apiLoading, setApiLoading] = useState(true);
    const [apiError, setApiError] = useState(false);

    const fetchAll = useCallback(async () => {
        setApiLoading(true);
        try {
            const [acctRes, statsRes, batchRes] = await Promise.all([
                getAccounts({ limit: 100 }),
                getPortfolioStats(),
                getLatestBatch(),
            ]);
            setAccounts(acctRes.data || []);
            setPortfolioApi(statsRes.data || null);
            setLatestBatch(batchRes.data || null);
            setApiError(false);
        } catch {
            setApiError(true);
        } finally {
            setApiLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Derived stats (Layer 1 & 2 Logic) ─────────────────────────────
    const customers = accounts;
    const t3Count = portfolioApi?.tiers?.['Tier 3']?.count ?? 0;
    const avgRisk = portfolioApi?.velocityStats?.avgRisk != null ? (portfolioApi.velocityStats.avgRisk * 100).toFixed(1) : '—';
    const totalExposure = portfolioApi?.totalExposure != null ? `₹${(portfolioApi.totalExposure / 1000000).toFixed(1)}M` : "0";
    const atRiskExposure = portfolioApi?.atRiskExposure != null ? `₹${(portfolioApi.atRiskExposure / 1000).toFixed(1)}k` : "0";

    // Mocking Layer 1/2 for demonstration in dashboard:
    const salaryConsumptionIndex = "68.4%"; // Aggregated burn rate
    const proximityAlerts = customers.filter(c => c.risk > 0.6).length; // T-14 Window triggers

    const diagnosisDistribution = portfolioApi?.diagnosisDistribution ?? [];

    const chartData = useMemo(() => {
        const history = portfolioApi?.fleetHistory || [];
        if (history.length === 0) return [];
        return history.slice(-timeRange).map((val, i) => ({
            index: i,
            risk: val.risk.toFixed(1),
            date: `D-${history.length - i}`,
        }));
    }, [timeRange, portfolioApi]);

    const pieData = [
        { name: 'Tier 3 (Critical)', value: t3Count, color: '#f43f5e' },
        { name: 'Tier 2 (Warning)', value: portfolioApi?.tiers?.['Tier 2']?.count ?? 0, color: '#fbbf24' },
        { name: 'Tier 1 (Watch)', value: portfolioApi?.tiers?.['Tier 1']?.count ?? 0, color: '#10b981' },
    ];

    const signalEvents = useMemo(() => {
        const source = customers.slice(0, 8);
        return source.map((c) => {
            const sigs = (typeof c.signals === 'object' && c.signals !== null) ? c.signals : {};
            const maxSignal = Object.entries(sigs).reduce((max, [k, v]) => v > max.v ? { k, v } : max, { k: 's1', v: 0 });
            return {
                time: c.updated_at ? new Date(c.updated_at).toLocaleTimeString() : 'N/A',
                name: c.name,
                signal: signalNames[maxSignal.k] ?? maxSignal.k,
                value: Number(maxSignal.v).toFixed(2),
                color: maxSignal.v > 0.7 ? 'var(--tier-3)' : maxSignal.v > 0.4 ? 'var(--tier-2)' : 'var(--tier-1)',
            };
        });
    }, [customers]);

    if (apiLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '4rem', alignItems: 'center' }}>
                    <RefreshCcw size={24} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                    <span className="mono text-dim" style={{ fontSize: '0.75rem' }}>INITIALIZING_VECTOR_CORE...</span>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </motion.div>
        );
    }

    const startPipeline = async () => {
        try {
            await fetch('http://localhost:5000/api/pipeline/start', { method: 'POST' });
        } catch (e) {
            console.error('Failed to start pipeline flux:', e);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <header className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>VECTOR Operational Overwatch</h1>
                        <p className="mono text-dim" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>LAYER_1: DATA_STREAMING // LAYER_2: TRIGGER_ORCHESTRATION</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={startPipeline} className="mono" style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 900 }}>
                            <Zap size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }}/> START FLOW
                        </button>
                        <div className="mono" style={{ fontSize: '0.55rem', padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                            <span className="text-dim">ENGINE:</span> <span className={apiError ? 'text-red' : 'text-green'}>{apiError ? 'DATALINK_FAILURE' : 'SYNC_ACTIVE'}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Layer 1 & 2 KPI Row */}
            <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                    { label: 'Monitored Portfolio', value: customers.length, desc: 'Layer 1: Real-time Ingestion', icon: Users, color: 'var(--primary)' },
                    { label: 'Salary Consumption', value: salaryConsumptionIndex, desc: 'Layer 1: Spend vs Salary', icon: Zap, color: 'var(--tier-2)' },
                    { label: 'Trigger Proximity', value: proximityAlerts, desc: 'Layer 2: Critical Checkpoints', icon: Clock, color: 'var(--tier-3)' },
                    { label: 'Avg Fleet Risk', value: `${avgRisk}%`, desc: 'Layer 4: Fused Scoring', icon: Target, color: 'var(--primary)' },
                ].map((stat, i) => (
                    <div key={i} className="technical-card" style={{ padding: '1.25rem', borderLeft: `3px solid ${stat.color}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div className="stat-label" style={{ fontSize: '0.5rem' }}>{stat.label}</div>
                            <stat.icon size={14} style={{ color: stat.color, opacity: 0.8 }} />
                        </div>
                        <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.25rem' }}>{stat.value}</div>
                        <div className="mono text-dim" style={{ fontSize: '0.45rem', opacity: 0.6 }}>{stat.desc}</div>
                    </div>
                ))}
            </div>

            <div className="content-grid" style={{ gridTemplateColumns: '1fr 340px', gap: '2rem' }}>
                <main className="main-column">
                    <div className="technical-card" style={{ padding: '1.5rem', height: '360px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 800 }}>AGGREGATE_RISK_MOMENTUM (PORTFOLIO_TRAJECTORY)</span>
                            <div className="mono" style={{ display: 'flex', gap: '0.5rem' }}>
                                {[7, 30, 90].map(r => (
                                    <button key={r} onClick={() => setTimeRange(r)} style={{
                                        background: timeRange === r ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        border: 'none', color: timeRange === r ? 'black' : 'var(--text-dim)',
                                        padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.5rem', fontWeight: 800
                                    }}>{r}D</button>
                                ))}
                            </div>
                        </div>
                        <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} minTickGap={20} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: 'var(--text-dim)' }} />
                                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.7rem' }} />
                                    <Area type="monotone" dataKey="risk" stroke="var(--primary)" fillOpacity={1} fill="url(#riskGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginTop: '2rem' }}>
                        <div className="technical-card">
                            <div className="sidebar-section" style={{ padding: 0, marginBottom: '1.25rem' }}>Stress Profile Synthesis (Layer 6)</div>
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={diagnosisDistribution} layout="vertical">
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="diagnosis" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 7, fill: 'var(--text-dim)' }} width={100} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: '0.65rem' }} />
                                        <Bar dataKey="count" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={12} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="technical-card">
                             <div className="sidebar-section" style={{ padding: 0, marginBottom: '1.25rem' }}>Tier Concentration</div>
                             <div style={{ height: 180 }}>
                                 <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                         <Pie data={pieData} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                             {pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                         </Pie>
                                         <Tooltip />
                                     </PieChart>
                                 </ResponsiveContainer>
                             </div>
                             <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '0.5rem' }}>
                                 {pieData.map(d => (
                                     <div key={d.name} style={{ textAlign: 'center' }}>
                                         <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 900, color: d.color }}>{d.value}</div>
                                         <div className="stat-label" style={{ fontSize: '0.4rem' }}>{d.name.split(' ')[1]}</div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </main>

                <aside className="side-column">
                    <div className="technical-card" style={{ background: 'rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <ShieldCheck size={16} className="text-primary" />
                            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 900 }}>SYSTEM_HEALTH</span>
                        </div>
                        <div className="mono" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>DATALINK: <span className="text-green">ACTIVE</span></div>
                        <div className="mono" style={{ fontSize: '0.65rem', marginBottom: '0.5rem' }}>THESHOLD_SYNC: <span className="text-green">STABLE</span></div>
                        <div className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>LAST_HEARTBEAT: {new Date().toLocaleTimeString()}</div>
                    </div>

                    <div className="technical-card">
                        <div className="sidebar-section" style={{ padding: 0, marginBottom: '1rem' }}>Anomalous Trigger Stream (Layer 2)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            {signalEvents.map((ev, i) => (
                                <div key={i} style={{ paddingBottom: '0.75rem', borderBottom: i === signalEvents.length - 1 ? 'none' : '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                        <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 800 }}>{ev.name}</span>
                                        <span className="mono text-dim" style={{ fontSize: '0.5rem' }}>{ev.time}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="mono" style={{ fontSize: '0.55rem', color: ev.color, fontWeight: 700 }}>{ev.signal}</span>
                                        <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 900 }}>{ev.value}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="technical-card glass" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <Zap size={14} className="text-yellow" />
                            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 800 }}>PIPELINE_INSIGHT</span>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                            Anomalous daily burn rate detected across <span className="text-white">4.2%</span> of Tier 3 population. Salary decoupling triggers activated for high-proximity payment cycles.
                        </p>
                    </div>
                </aside>
            </div>
        </motion.div>
    );
};

export default Dashboard;
