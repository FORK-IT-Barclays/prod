import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getPortfolioStats } from '../services/api';
import { Activity, Zap, Shield, AlertCircle, RefreshCcw, TrendingUp, BarChart3, Target } from 'lucide-react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const FleetAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [apiError, setApiError] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPortfolioStats();
            setStats(res.data);
            setApiError(false);
        } catch {
            setApiError(true);
            setStats(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const signalHealth = stats?.signalHealth || [];
    
    // Layer 5: Fleet Kinematics Simulation
    const fleetKinematics = [
        { x: 0.045, y: 0.012, z: 45, name: 'Tier 1' },
        { x: 0.12, y: 0.08, z: 80, name: 'Tier 2' },
        { x: 0.28, y: 0.15, z: 120, name: 'Tier 3' },
    ];

    if (loading && !stats) {
        return (
            <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <RefreshCcw className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <header className="page-header" style={{ marginBottom: '2.5rem' }}>
                <div>
                    <h1>Fleet Operational Observatory</h1>
                    <p className="mono text-dim" style={{ fontSize: '0.72rem', marginTop: '0.25rem' }}>
                        LAYER_3: SIGNAL_EXTRACTION // LAYER_5: KINEMATIC_SYNTHESIS
                    </p>
                </div>
                <button onClick={fetchStats} className="mono" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RefreshCcw size={10} style={loading ? { animation: 'spin 1s linear infinite' } : {}} /> REFRESH_TELEMETRY
                </button>
            </header>

            <div className="content-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
                <main className="main-column">
                    <section>
                         <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Activity size={14} className="text-primary" /> Layer 3: Signal Distribution
                        </div>
                        <div className="heat-map-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                            {signalHealth.slice(0, 8).map((s) => (
                                <div key={s.signal} className="technical-card" style={{ padding: '1rem' }}>
                                    <div className="mono" style={{ fontSize: '0.55rem', fontWeight: 800, marginBottom: '0.75rem', opacity: 0.6 }}>{s.signal}</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.4rem' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 900 }}>{(s.severity * 10).toFixed(1)}</div>
                                        <div className="mono text-dim" style={{ fontSize: '0.5rem' }}>/ 10</div>
                                    </div>
                                    <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1 }}>
                                        <div style={{ height: '100%', width: `${s.severity * 100}%`, background: s.severity > 0.7 ? 'var(--tier-3)' : 'var(--primary)' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section>
                        <div className="sidebar-section" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Zap size={14} className="text-yellow" /> Layer 5: Fleet Kinematics (Trajectory Matrix)
                        </div>
                        <div className="technical-card" style={{ height: 320, padding: '1.5rem' }}>
                             <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" dataKey="x" name="Velocity" unit=" dS/dt" label={{ value: 'Fleet Velocity', position: 'bottom', fontSize: 10, fill: 'var(--text-dim)' }} tick={{fontSize: 9}} />
                                    <YAxis type="number" dataKey="y" name="Acceleration" unit=" d²S/dt²" label={{ value: 'Acceleration', angle: -90, position: 'left', fontSize: 10, fill: 'var(--text-dim)' }} tick={{fontSize: 9}} />
                                    <ZAxis type="number" dataKey="z" range={[100, 500]} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter name="Tier Aggregates" data={fleetKinematics}>
                                        {fleetKinematics.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 2 ? 'var(--tier-3)' : index === 1 ? 'var(--tier-2)' : 'var(--tier-1)'} fillOpacity={0.6} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                             </ResponsiveContainer>
                        </div>
                    </section>
                </main>

                <aside className="side-column">
                    <div className="technical-card">
                        <div className="sidebar-section" style={{ padding: 0, marginBottom: '1rem' }}>Systemic Correlation (Layer 3)</div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>Identified lead indicators for behavioral drift across current windows.</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                             {[
                                { pair: 'S5_DECAY → S1_DRIFT', corr: '0.84', delay: '8D', color: 'var(--tier-3)' },
                                { pair: 'S3_EXH → S6_EXT', corr: '0.72', delay: '14D', color: 'var(--tier-2)' },
                                { pair: 'S4_VEL → T3_TRANS', corr: '0.65', delay: '3D', color: 'var(--tier-1)' },
                             ].map((row, i) => (
                                <div key={i} style={{ padding: '0.6rem', border: '1px solid var(--border)', borderRadius: '6px' }}>
                                    <div className="mono" style={{ fontSize: '0.55rem', fontWeight: 800, marginBottom: '0.25rem' }}>{row.pair}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="mono" style={{ fontSize: '0.6rem', color: row.color }}>Corr: {row.corr}</div>
                                        <div className="mono text-dim" style={{ fontSize: '0.5rem' }}>Delay: {row.delay}</div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    </div>

                    <div className="technical-card" style={{ background: 'rgba(56,189,248,0.02)' }}>
                        <div className="sidebar-section" style={{ padding: 0, marginBottom: '1rem' }}>Layer 2: Trigger Status</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                             {[
                                { label: 'ANOMALOUS_BURN_DETECT', val: 'ACTIVE', color: 'var(--tier-3)' },
                                { label: 'T-14_WINDOW_MONITOR', val: 'STABLE', color: 'var(--tier-1)' },
                                { label: 'SALARY_DECOUPLING', val: 'WARNING', color: 'var(--tier-2)' },
                             ].map((t, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="mono" style={{ fontSize: '0.55rem', fontWeight: 800 }}>{t.label}</span>
                                    <span className="mono" style={{ fontSize: '0.55rem', fontWeight: 900, color: t.color }}>{t.val}</span>
                                </div>
                             ))}
                        </div>
                    </div>

                    <div className="technical-card glass" style={{ borderColor: 'var(--tier-3)' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <AlertCircle size={14} className="text-red" />
                            <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 900 }}>CRITICAL_FLEET_BULLETIN</span>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.5, margin: 0 }}>
                            Batch <span className="text-white">#{stats?.latestBatch?.batchId || '724'}</span> indicates systemic liquidity momentum shift in Tier 2 sectors. Recommend Layer 7 pre-emptive SMS-nudge dispersal.
                        </p>
                    </div>
                </aside>
            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </motion.div>
    );
};

export default FleetAnalytics;
