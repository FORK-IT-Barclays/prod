import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, RefreshCcw, Search, ShieldAlert, Filter, Check, Send, X, Users, MessageSquareText } from 'lucide-react';
import { getAccounts, getLatestBatch, addIntervention } from '../services/api';

const STRESS_ARCHETYPES = {
    'ACUTE_INCOME_SHOCK': { label: 'Acute Income Shock', icon: '⚡', color: '#f43f5e', desc: 'Sudden drop in cash inflow + high velocity.' },
    'CHRONIC_OVERSPENDER': { label: 'Chronic Overspender', icon: '💸', color: '#fbbf24', desc: 'Consistent liquidity burn + structural deficit.' },
    'LIQUIDITY_TRAP': { label: 'Liquidity Trap', icon: '🪤', color: '#ef4444', desc: 'Maxed credit + high structural debt.' },
    'STABLE_MONITOR': { label: 'Stable Monitor', icon: '🛡️', color: '#10b981', desc: 'Low risk currently observed.' }
};

const InterventionQueue = () => {
    // ── API state ─────────────────────────────────────────────────────
    const [accounts, setAccounts] = useState([]);
    const [latestBatch, setLatestBatch] = useState(null);
    const [apiLoading, setApiLoading] = useState(true);
    const [apiError, setApiError] = useState(false);

    const fetchData = useCallback(async () => {
        setApiLoading(true);
        try {
            const [acctRes, batchRes] = await Promise.all([
                getAccounts({ limit: 100 }),
                getLatestBatch(),
            ]);
            setAccounts(acctRes.data || []);
            setLatestBatch(batchRes.data || null);
            setApiError(false);
        } catch {
            setApiError(true);
            setAccounts([]);
            setLatestBatch(null);
        } finally {
            setApiLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Filters ───────────────────────────────────────────────────────
    const [tierFilter, setTierFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    // ── Shortlist / Batch ─────────────────────────────────────────────
    const [shortlisted, setShortlisted] = useState(new Set());
    const [batchSending, setBatchSending] = useState(false);
    const [batchSent, setBatchSent] = useState(false);
    const [batchAction, setBatchAction] = useState('SMS_NUDGE');

    // ── Helper: Derive Stress Archetype ───────────────────────────────
    // Logic: Layer 6 of VECTOR Pipeline
    const getArchetype = (c) => {
        if (c.risk > 0.7 && c.velocity > 0.1) return 'ACUTE_INCOME_SHOCK';
        if (c.velocity > 0.05 && c.risk > 0.4) return 'CHRONIC_OVERSPENDER';
        if (c.risk > 0.6 && c.accel > 0.2) return 'LIQUIDITY_TRAP';
        return 'STABLE_MONITOR';
    };

    const filteredCustomers = useMemo(() => {
        let list = [...accounts];
        if (tierFilter !== 'all') list = list.filter(c => c.tier === tierFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
        }
        list.sort((a, b) => (b.risk * b.velocity) - (a.risk * a.velocity)); // Sort by Urgency strictly
        return list;
    }, [accounts, tierFilter, searchQuery]);

    const handleBatchSend = async () => {
        setBatchSending(true);
        try {
            const promises = [...shortlisted].map(id =>
                addIntervention(id, { type: batchAction }).catch(() => null)
            );
            await Promise.all(promises);
        } catch { /* best-effort */ } finally {
            setBatchSending(false);
            setBatchSent(true);
            setTimeout(() => setBatchSent(false), 3000);
        }
    };

    const toggleShortlist = (id) => setShortlisted(prev => {
        const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next;
    });

    const shortlistedCustomers = accounts.filter(c => shortlisted.has(c.id));
    const tierCounts = useMemo(() => ({
        all: accounts.length,
        'Tier 3': accounts.filter(c => c.tier === 'Tier 3').length,
        'Tier 2': accounts.filter(c => c.tier === 'Tier 2').length,
        'Tier 1': accounts.filter(c => c.tier === 'Tier 1').length,
    }), [accounts]);

    const batchId = latestBatch?.batchId || "N/A";

    // Layer 7: GenAI Draft Preview Logic
    const getDraftMessage = (customer, action) => {
        const archKey = getArchetype(customer);
        const arch = STRESS_ARCHETYPES[archKey];
        if (action === 'SMS_NUDGE') {
            return `Hi ${customer.name}, we noticed some changes in your account activity. We're here to support you with flexible payment options or a quick chat to help manage your bills this month. Type HELP to see options.`;
        }
        if (action === 'RM_CALL') {
            return `[RM PRIORITY] Call protocol activated for ${customer.name} (${arch.label}). Propose 30-day EMI holiday due to anomalous velocity of ${customer.velocity}.`;
        }
        return `Default intervention for ${customer.name}...`;
    };

    if (apiLoading) {
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '4rem', alignItems: 'center' }}>
                    <RefreshCcw size={24} className="text-primary" style={{ animation: 'spin 1s linear infinite' }} />
                    <span className="mono text-dim" style={{ fontSize: '0.75rem' }}>SYNCHRONIZING_INTERVENTION_STATE...</span>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="page-container">
            <header className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                        <h1>Crisis Dispatch Queue</h1>
                        <p className="mono text-dim" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>7-LAYER_PIPELINE // STRESS_TYPE_SYNTHESIS</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button onClick={fetchData} className="mono" style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <RefreshCcw size={10} /> REFRESH
                        </button>
                        <div className="glass" style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '220px' }}>
                            <Search size={13} className="text-dim" />
                            <input type="text" placeholder="Search accounts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="mono" style={{ background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: '0.7rem', width: '100%' }} />
                        </div>
                    </div>
                </div>
            </header>

            {/* Tier Navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['all', 'Tier 3', 'Tier 2', 'Tier 1'].map(t => (
                    <button key={t} onClick={() => setTierFilter(t)} className="mono"
                        style={{
                            padding: '0.4rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 800,
                            background: tierFilter === t ? 'var(--primary)' : 'rgba(255,255,255,0.02)',
                            border: '1px solid var(--border)',
                            color: tierFilter === t ? 'black' : 'var(--text-dim)',
                        }}>
                        {t.toUpperCase()} ({tierCounts[t]})
                    </button>
                ))}
            </div>

            <div className="content-grid" style={{ gridTemplateColumns: '1fr 360px', gap: '2rem' }}>
                <main className="main-column">
                    <div className="technical-card" style={{ padding: 0, maxHeight: '60vh', overflowY: 'auto' }}>
                        <table className="institutional-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 30 }}></th>
                                    <th>Loan Account</th>
                                    <th>Stress Archetype (L6)</th>
                                    <th>Risk Vector</th>
                                    <th>Urgency</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCustomers.map(c => {
                                    const isSelected = shortlisted.has(c.id);
                                    const archetype = STRESS_ARCHETYPES[getArchetype(c)];
                                    const urgency = (c.risk * c.velocity * 10).toFixed(2);
                                    return (
                                        <tr key={c.id} style={{ cursor: 'pointer', background: isSelected ? 'rgba(56,189,248,0.04)' : 'transparent' }} onClick={() => toggleShortlist(c.id)}>
                                            <td>
                                                <div style={{ width: 16, height: 16, borderRadius: '3px', border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)', background: isSelected ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {isSelected && <Check size={10} color="black" strokeWidth={3} />}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{c.name}</div>
                                                <div className="mono text-dim" style={{ fontSize: '0.55rem' }}>{c.id}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.9rem' }}>{archetype.icon}</span>
                                                    <div className="mono" style={{ fontSize: '0.65rem', fontWeight: 700, color: archetype.color }}>{archetype.label.toUpperCase()}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="mono" style={{ fontSize: '0.65rem' }}>
                                                   V: {c.velocity > 0 ? '▲' : '▼'} {Math.abs(c.velocity).toFixed(3)}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="mono" style={{ fontWeight: 900, fontSize: '0.8rem', color: parseFloat(urgency) > 0.5 ? 'var(--tier-3)' : 'var(--tier-1)' }}>
                                                    {urgency}U
                                                </div>
                                            </td>
                                            <td><span className={`tier-tag ${c.tier.toLowerCase().replace(' ', '')}`}>{c.tier}</span></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>

                <aside className="side-column">
                    <div className="technical-card" style={{ background: shortlisted.size > 0 ? 'rgba(56,189,248,0.03)' : 'rgba(0,0,0,0.1)', borderColor: shortlisted.size > 0 ? 'var(--primary)' : 'var(--border)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <Users size={16} className="text-primary" />
                            <span className="mono" style={{ fontSize: '0.7rem', fontWeight: 900 }}>BATCH_STRATEGY</span>
                            {shortlisted.size > 0 && <span className="mono" style={{ fontSize: '0.6rem', color: 'var(--primary)', marginLeft: 'auto' }}>{shortlisted.size} SELECTED</span>}
                        </div>

                        {shortlisted.size === 0 ? (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>Select vulnerable accounts to coordinate a proactive intervention response.</p>
                        ) : (
                            <>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="stat-label" style={{ fontSize: '0.55rem', display: 'block', marginBottom: '0.4rem' }}>Intervention Channel</label>
                                    <select value={batchAction} onChange={e => setBatchAction(e.target.value)} className="mono"
                                        style={{ width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'white', padding: '0.4rem', borderRadius: '4px', fontSize: '0.65rem' }}>
                                        <option value="SMS_NUDGE">AI_SMS_NUDGE (Empathy Mode)</option>
                                        <option value="RM_CALL">RM_DIRECT_ESCALATION</option>
                                        <option value="WHATSAPP_NUDGE">WHATSAPP_CONCIERGE</option>
                                        <option value="EMI_HOLIDAY_OFFER">RESOLUTION: 30D EMI Holiday</option>
                                    </select>
                                </div>

                                <div className="technical-card glass" style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <MessageSquareText size={12} className="text-primary" />
                                        <span className="mono" style={{ fontSize: '0.55rem', fontWeight: 900 }}>GEN_AI_EMPATHY_DRAFT (PREVIEW)</span>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                        "{getDraftMessage(shortlistedCustomers[0], batchAction)}"
                                    </div>
                                </div>

                                <button onClick={handleBatchSend} disabled={batchSending || batchSent} className="mono"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', cursor: 'pointer', background: batchSent ? 'var(--tier-1)' : 'var(--primary)', border: 'none', color: 'black', fontSize: '0.7rem', fontWeight: 900 }}>
                                    {batchSent ? 'BATCH_DISPATCHED' : batchSending ? 'SAVING_TO_STREAMS...' : `DISPATCH INTERVENTION (${shortlisted.size})`}
                                </button>
                            </>
                        )}
                    </div>

                    <div className="technical-card" style={{ background: 'rgba(244,63,94,0.02)', border: '1px dashed var(--tier-3)' }}>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <ShieldAlert size={14} className="text-red" />
                            <span className="mono" style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--tier-3)' }}>PROTOCOLS: LAYER 7 (GOVERNANCE)</span>
                        </div>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', lineHeight: 1.4, margin: 0 }}>
                            High-velocity deteriorations automatically trigger Relationship Manager (RM) escalation. No autonomous restructuring happens without Human-in-the-Loop review.
                        </p>
                    </div>
                </aside>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `.tier-tag { font-size: 0.55rem; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 900; display: inline-block; text-transform: uppercase; border: 1px solid transparent; } .tier-tag.tier3 { background: rgba(244,63,94,0.1); color: var(--tier-3); border-color: rgba(244,63,94,0.2); } .tier-tag.tier2 { background: rgba(251,191,36,0.1); color: var(--tier-2); border-color: rgba(251,191,36,0.2); } .tier-tag.tier1 { background: rgba(16,185,129,0.1); color: var(--tier-1); border-color: rgba(16,185,129,0.2); }` }} />
        </motion.div>
    );
};

export default InterventionQueue;
