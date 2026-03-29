import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Search as SearchIcon, User, RefreshCcw, Info, Zap, Calendar, ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { getAccounts } from '../services/api';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
    CartesianGrid, ScatterChart, Scatter, ZAxis
} from 'recharts';

const signalFullNames = {
    s1: 'Salary Payment Drift',
    s2: 'Liquidity Pressure',
    s3: 'Income Exhaustion',
    s4: 'Spend Velocity Spike',
    s5: 'App Engagement Decay',
    s6: 'External Obligations',
    s7: 'Cash-out Shift',
    s8: 'Payment Failures'
};

const CustomerSearch = () => {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const [timeRange, setTimeRange] = useState(30);

    // ── API state ─────────────────────────────────────────────────────
    const [accounts, setAccounts] = useState([]);
    const [apiLoading, setApiLoading] = useState(true);
    const [apiError, setApiError] = useState(false);

    // GenAI Report State
    const [showReport, setShowReport] = useState(false);
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    const generateGenAIReport = async (accountId) => {
        setReportLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/reports/genai/${accountId}`);
            const json = await res.json();
            if (json.success) {
                setReport(json.data);
                setShowReport(true);
            }
        } catch (err) {
            console.error('Failed to generate GenAI report', err);
        } finally {
            setReportLoading(false);
        }
    };

    const fetchAccounts = useCallback(async () => {
        setApiLoading(true);
        try {
            const res = await getAccounts({ limit: 100 });
            setAccounts(res.data || []);
            setApiError(false);
        } catch {
            setApiError(true);
        } finally {
            setApiLoading(false);
        }
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    const filtered = accounts.filter(c =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.id.toLowerCase().includes(query.toLowerCase())
    );

    const currentChartData = useMemo(() => {
        if (!selected || !selected.history) return [];
        return selected.history.slice(-timeRange).map((val, i) => ({
            day: i,
            risk: parseFloat(Number(val).toFixed(2)),
            date: `D-${selected.history.length - i}`,
        }));
    }, [selected, timeRange]);

    // Layer 5: Kinematic Trajectory Data
    const kinematicsData = useMemo(() => {
        if (!selected) return [];
        return [{
            x: selected.velocity,
            y: selected.accel,
            z: selected.risk * 100,
            name: selected.name
        }];
    }, [selected]);

    if (apiLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '4rem', alignItems: 'center' }}>
                    <RefreshCcw size={24} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                    <span className="mono text-dim" style={{ fontSize: '0.75rem' }}>RETRIEVING_ACCOUNT_AUDIT_LOGS...</span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>Loan Account Audit</h1>
                        <p className="mono text-dim" style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>LAYER_4: EXPLAINABILITY // LAYER_5: KINEMATICS</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '300px' }}>
                            <SearchIcon size={14} className="text-dim" />
                            <input type="text" placeholder="Search by name or ID..." value={query} onChange={e => setQuery(e.target.value)}
                                className="mono" style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.7rem', width: '100%' }} />
                        </div>
                    </div>
                </div>
            </header>

            <div className="content-grid" style={{ gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
                <aside className="side-column">
                    <div className="sidebar-section" style={{ padding: 0, marginBottom: '0.75rem' }}>Live Account Stream</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '72vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        {filtered.map(c => (
                            <div key={c.id} onClick={() => setSelected(c)} className={`technical-card ${selected?.id === c.id ? 'active' : ''}`}
                                style={{
                                    padding: '1rem', cursor: 'pointer', transition: 'all 0.2s',
                                    backgroundColor: selected?.id === c.id ? 'rgba(56,189,248,0.1)' : 'rgba(0,0,0,0.1)',
                                    borderColor: selected?.id === c.id ? 'var(--primary)' : 'var(--border)'
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{c.name}</div>
                                        <div className="mono text-dim" style={{ fontSize: '0.5rem' }}>{c.id}</div>
                                    </div>
                                    <div className="mono" style={{ fontSize: '0.75rem', fontWeight: 900, color: c.risk > 0.7 ? 'var(--tier-3)' : 'var(--tier-1)' }}>
                                        {(c.risk * 100).toFixed(0)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="main-column">
                    {selected ? (
                        <div key={selected.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <User size={22} className="text-primary" />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.4rem', margin: 0 }}>{selected.name}</h2>
                                        <div className="mono text-dim" style={{ fontSize: '0.65rem' }}>AUDIT_ID: {selected.id} // TIER: {selected.tier}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <button onClick={() => generateGenAIReport(selected.id)} className="mono" 
                                        style={{ padding: '0.5rem 1rem', background: 'rgba(56,189,248,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 900 }}>
                                        {reportLoading ? 'GENERATING...' : 'GENAI_EMPATHY_REPORT'}
                                    </button>
                                    <div style={{ display: 'flex', gap: '2rem' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="stat-label" style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>LOAN_BALANCE</div>
                                            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 800 }}>₹{Number(selected.balance).toLocaleString('en-IN')}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div className="stat-label" style={{ fontSize: '0.5rem', color: 'var(--text-dim)' }}>FUSED_RISK_SCORE</div>
                                            <div className="mono" style={{ fontSize: '1.1rem', fontWeight: 900, color: selected.risk > 0.7 ? 'var(--tier-3)' : 'var(--tier-1)' }}>{(selected.risk * 100).toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* GenAI Report Modal Overlay */}
                            {showReport && report && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                                    <div className="technical-card" style={{ width: '100%', maxWidth: '600px', padding: '2rem', border: '1px solid var(--primary)', position: 'relative' }}>
                                        <button onClick={() => setShowReport(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>×</button>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <Zap size={18} className="text-primary" />
                                            <h3 className="mono" style={{ margin: 0, fontSize: '1rem' }}>VECTOR_GENAI_INTERVENTION_REPORT</h3>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <span className="mono text-dim" style={{ fontSize: '0.7rem' }}>EMOTIONAL_TONE:</span>
                                            <span className="mono text-primary" style={{ fontSize: '0.7rem', fontWeight: 900 }}>{report.metadata.tone}</span>
                                        </div>

                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                                            <div className="mono text-dim" style={{ fontSize: '0.55rem', marginBottom: '0.5rem' }}>AI_SYNTHESIS_SUMMARY:</div>
                                            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, margin: 0, color: 'white' }}>{report.analysis.synthesis}</p>
                                            <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.75rem' }}>
                                                <div className="mono text-dim" style={{ fontSize: '0.55rem', marginBottom: '0.5rem' }}>MODEL_FUSION:</div>
                                                <div className="mono text-white" style={{ fontSize: '0.75rem' }}>{report.analysis.fusion}</div>
                                            </div>
                                        </div>

                                        <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                                            <div className="mono text-dim" style={{ fontSize: '0.55rem', marginBottom: '0.5rem' }}>SUGGESTED_EMPATHETIC_MESSAGE:</div>
                                            <p style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>"{report.intervention.message}"</p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                            <button className="mono" style={{ flex: 1, padding: '0.75rem', background: 'var(--primary)', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 900, cursor: 'pointer' }}>SEND_INTERVENTION_SMS</button>
                                            <button className="mono" style={{ flex: 1, padding: '0.75rem', background: 'transparent', border: '1px solid var(--border)', color: 'white', borderRadius: '4px', fontWeight: 900, cursor: 'pointer' }}>LOG_TO_CRM</button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.5rem' }}>
                                {/* Layer 5: Visual Trajectory */}
                                <div className="technical-card" style={{ padding: '1.25rem' }}>
                                    <div className="sidebar-section" style={{ padding: 0, marginBottom: '1rem' }}>Kinematic Risk Trajectory (Velocity vs Acceleration)</div>
                                    <div style={{ height: 240 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                                <XAxis type="number" dataKey="x" name="Velocity" unit=" dS/dt" label={{ value: 'Velocity', position: 'bottom', fontSize: 10, fill: 'var(--text-dim)' }} tick={{fontSize: 9}} />
                                                <YAxis type="number" dataKey="y" name="Acceleration" unit=" d²S/dt²" label={{ value: 'Acceleration', angle: -90, position: 'left', fontSize: 10, fill: 'var(--text-dim)' }} tick={{fontSize: 9}} />
                                                <ZAxis type="number" dataKey="z" range={[100, 1000]} name="Risk" />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Scatter name="Risk Vector" data={kinematicsData} fill="var(--primary)" />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="mono text-dim" style={{ fontSize: '0.6rem', textAlign: 'center', marginTop: '1rem' }}>
                                        TRAJECTORY: {selected.velocity > 0 ? 'DETERIORATING' : 'STABILIZING'} // MOMENTUM: {selected.accel > 0 ? 'ACCELERATING' : 'DECELERATING'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    {/* Layer 1: Salary & Proximity */}
                                    <div className="technical-card" style={{ background: 'rgba(56,189,248,0.03)' }}>
                                        <div className="sidebar-section" style={{ padding: 0, marginBottom: '0.75rem' }}>Salary Proximity (L1)</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                            <Calendar size={14} className="text-primary" />
                                            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 900 }}>T-14 PAYMENT WINDOW</span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <div className="stat-label" style={{ fontSize: '0.45rem' }}>Agg. Spend</div>
                                                <div className="mono" style={{ fontSize: '0.8rem', fontWeight: 800 }}>62.4%</div>
                                            </div>
                                            <div>
                                                <div className="stat-label" style={{ fontSize: '0.45rem' }}>Sal. Drift</div>
                                                <div className="mono" style={{ fontSize: '0.8rem', fontWeight: 800 }}>-2.1%</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Layer 4: SHAP Attribution */}
                                    <div className="technical-card">
                                        <div className="sidebar-section" style={{ padding: 0, marginBottom: '0.75rem' }}>SHAP Attribution (L4)</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                            {Object.entries(selected.signals || {}).slice(0, 4).map(([key, val]) => (
                                                <div key={key}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                        <span className="mono text-dim" style={{ fontSize: '0.5rem' }}>{signalFullNames[key] || key}</span>
                                                        <span className="mono" style={{ fontSize: '0.55rem', fontWeight: 700 }}>+{Math.abs(val).toFixed(2)}</span>
                                                    </div>
                                                    <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                                                        <div style={{ height: '100%', width: `${Math.abs(val) * 100}%`, background: val > 0.5 ? 'var(--tier-3)' : 'var(--primary)', borderRadius: '2px' }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                                <div className="technical-card" style={{ borderLeft: `3px solid ${selected.risk > 0.6 ? 'var(--tier-3)' : 'var(--tier-1)'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Activity size={14} className="text-primary" />
                                        <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 900 }}>REASONING_LOG</span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
                                        Automated diagnosis: <span className="mono text-white" style={{ fontWeight: 700 }}>{selected.diagnosis}</span>.
                                        Explainability Layer identifies <span className="text-white">Income Exhaustion</span> as the primary risk driver.
                                        Behavioral momentum shows a <span className={selected.accel > 0 ? 'text-red' : 'text-green'}>{selected.accel > 0 ? 'positive' : 'negative'} acceleration</span> of {selected.accel.toFixed(3)}, suggesting the risk is {selected.accel > 0 ? 'deepening' : 'plateauing'}.
                                    </div>
                                </div>
                                <div className="technical-card">
                                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Info size={14} className="text-primary" />
                                        <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 900 }}>LAYERED_INSIGHTS</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="mono text-dim" style={{ fontSize: '0.6rem' }}>STRUCTURAL_RISK (HISTORIAN)</span>
                                            <span className="mono text-white" style={{ fontSize: '0.6rem' }}>{selected.accel.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="mono text-dim" style={{ fontSize: '0.6rem' }}>BEHAVIORAL_RISK (VECTOR)</span>
                                            <span className="mono text-white" style={{ fontSize: '0.6rem' }}>{selected.velocity.toFixed(2)}</span>
                                        </div>
                                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 900 }}>SCALED_COORDINATION</span>
                                            <span className="mono text-primary" style={{ fontSize: '0.65rem', fontWeight: 900 }}>{(selected.risk * 100).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', opacity: 0.5 }}>
                            <Activity size={48} strokeWidth={1} style={{ marginBottom: '1rem' }} />
                            <div className="mono" style={{ fontSize: '0.8rem' }}>AWAITING_ACCOUNT_SELECTION</div>
                        </div>
                    )}
                </main>
            </div>
        </motion.div>
    );
};

export default CustomerSearch;
