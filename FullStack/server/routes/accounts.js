import express from 'express';
import { Customer } from '../models/Customer.js';
import { getCustomerName } from '../utils/nameGenerator.js';

const router = express.Router();

function mapCustomer(c) {
    const risk = c.latest_prediction?.final_risk_score || 0;
    const history = c.risk_history || [];
    const prevRisk = history.length > 1 ? history[history.length - 2].final_risk_score : risk;
    const riskChangeNum = risk - prevRisk;
    const riskChange = (riskChangeNum >= 0 ? '+' : '') + riskChangeNum.toFixed(2);
    
    let tier = 'Tier 1';
    if (risk > 0.7) tier = 'Tier 3';
    else if (risk > 0.4) tier = 'Tier 2';

    return {
        id: c.account_id,
        loanAccountId: c.account_id,
        name: getCustomerName(c.account_id),
        risk: risk,
        riskChange: riskChange,
        velocity: c.latest_prediction?.behavioral_score || 0,
        accel: c.latest_prediction?.historian_score || 0,
        balance: c.profile?.revol_bal !== undefined ? c.profile.revol_bal.toString() : '0',
        tier: tier,
        lastPayment: 'N/A',
        openedDate: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'N/A',
        history: history.map(h => (h.final_risk_score || 0) * 100),
        interventions: [],
        diagnosis: tier === 'Tier 3' ? 'CRITICAL_RISK' : (tier === 'Tier 2' ? 'ELEVATED_RISK' : 'STABLE'),
        signals: { s1: risk, s2: c.latest_prediction?.behavioral_score || 0 }
    };
}

router.get('/', async (req, res) => {
    try {
        const { search, page = 1, limit = 50, sortBy, sortDir } = req.query;
        let filter = {};
        if (search) filter.account_id = { $regex: search, $options: 'i' };
        
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const customers = await Customer.find(filter).skip(skip).limit(parseInt(limit)).lean();
        const total = await Customer.countDocuments(filter);

        res.json({
            success: true,
            data: customers.map(mapCustomer),
            pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/stats/portfolio', async (req, res) => {
    try {
        const customers = await Customer.find().lean();
        
        let totalExposure = 0;
        let atRiskExposure = 0;
        let activeInterventions = 0;
        
        // Strategy for portfolio history: aggregate mean risk from all customers who have history
        let historyAggregator = {}; // { dayIndex: { sum: 0, count: 0 } }

        for (let c of customers) {
            let mapped = mapCustomer(c);
            tiers[mapped.tier].count++;
            tiers[mapped.tier].avgRisk += mapped.risk;
            if (mapped.velocity > 0.08) highVelocityCount++;
            if (mapped.velocity < 0 && mapped.accel < 0) recoveringCount++;
            
            totalRisk += mapped.risk;
            totalVel += mapped.velocity;
            totalAccel += mapped.accel;

            // Exposure
            const bal = c.profile?.loan_amnt || c.profile?.revol_bal || 0;
            totalExposure += bal;
            if (mapped.tier === 'Tier 3') atRiskExposure += bal;

            // Health distribution
            diagnosisCounts[mapped.diagnosis] = (diagnosisCounts[mapped.diagnosis] || 0) + 1;

            // Aggregating history for fleet trend
            if (c.risk_history && Array.isArray(c.risk_history)) {
                c.risk_history.forEach((h, i) => {
                    if (!historyAggregator[i]) historyAggregator[i] = { sum: 0, count: 0 };
                    historyAggregator[i].sum += (h.final_risk_score || 0);
                    historyAggregator[i].count += 1;
                });
            }
        }

        for (let t in tiers) {
            if (tiers[t].count > 0) tiers[t].avgRisk /= tiers[t].count;
        }

        let diagnosisDistribution = Object.keys(diagnosisCounts).map(d => ({ diagnosis: d, count: diagnosisCounts[d] }));
        diagnosisDistribution.sort((a,b) => b.count - a.count);

        let velocityStats = {
            avgRisk: total > 0 ? (totalRisk / total) : 0,
            avgVelocity: total > 0 ? (totalVel / total) : 0,
            avgAccel: total > 0 ? (totalAccel / total) : 0,
            highVelocity: highVelocityCount,
            recovering: recoveringCount
        };

        // Format fleet history
        const fleetHistory = Object.keys(historyAggregator).sort((a,b) => a-b).map(idx => ({
            day: idx,
            risk: (historyAggregator[idx].sum / historyAggregator[idx].count) * 100
        }));

        res.json({
            success: true,
            data: {
                total,
                tiers,
                diagnosisDistribution,
                velocityStats,
                totalExposure,
                atRiskExposure,
                fleetHistory
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const c = await Customer.findOne({ account_id: req.params.id }).lean();
        if (!c) return res.status(404).json({ success: false, message: 'Account not found' });
        res.json({ success: true, data: mapCustomer(c) });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:id/interventions', async (req, res) => {
    res.json({ success: true, data: [], name: `Customer ${req.params.id}` });
});

router.post('/:id/interventions', async (req, res) => {
    const { type, outcome } = req.body;
    res.status(201).json({
        success: true,
        data: { date: new Date().toISOString().split('T')[0], type, outcome }
    });
});

export default router;
