// Helper to generate time-series data
const generateTrend = (points, startValue, volatility) => {
    let trend = [startValue];
    for (let i = 1; i < points; i++) {
        const change = (Math.random() - 0.5) * volatility;
        let nextVal = trend[i - 1] + change;
        nextVal = Math.max(10, Math.min(95, nextVal));
        trend.push(nextVal);
    }
    return trend;
};

// ——— Batch processing: all data is processed batch-by-batch for loan accounts only ———
export const batchProcessor = {
    lastBatchId: "B-2025-02-19-004",
    lastRunAt: "2025-02-19T06:00:00Z",
    accountsProcessed: 12480,
    batchSize: 5000,
    status: "COMPLETED",
    nextScheduledRun: "2025-02-19T18:00:00Z",
    recentBatches: [
        { id: "B-2025-02-19-004", runAt: "2025-02-19T06:00:00Z", accounts: 5000, status: "COMPLETED" },
        { id: "B-2025-02-19-003", runAt: "2025-02-19T00:00:00Z", accounts: 5000, status: "COMPLETED" },
        { id: "B-2025-02-18-002", runAt: "2025-02-18T18:00:00Z", accounts: 2480, status: "COMPLETED" },
    ],
};

const diagnoses = ["CRISIS SPIRAL", "HIDDEN ACCELERATION", "MANAGED DECLINE", "STABLE HIGH RISK", "EARLY WARNING", "MOMENTUM SHIFT", "STRONG RECOVERY", "NEUTRAL"];
const tierMap = {
    "CRISIS SPIRAL": "Tier 3",
    "HIDDEN ACCELERATION": "Tier 3",
    "MANAGED DECLINE": "Tier 2",
    "STABLE HIGH RISK": "Tier 2",
    "EARLY WARNING": "Tier 1",
    "MOMENTUM SHIFT": "Tier 1",
    "STRONG RECOVERY": "Tier 1",
    "NEUTRAL": "Tier 1",
};
const interventionTypes = ['SMS_NUDGE', 'AUTO_RESTRUCTURE_OFFER', 'RM_CALL', 'EMAIL_ALERT', 'WHATSAPP_NUDGE', 'EMI_HOLIDAY_OFFER'];
const outcomeTypes = ['NO_RESPONSE', 'PENDING', 'PROMISE_TO_PAY', 'SUCCESS', 'DECLINED', 'PARTIAL_PAY'];

function randomDate(startDaysAgo, endDaysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * (startDaysAgo - endDaysAgo) + endDaysAgo));
    return d.toISOString().split('T')[0];
}

function randomInterventions(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
        list.push({
            date: randomDate(60, 1),
            type: interventionTypes[Math.floor(Math.random() * interventionTypes.length)],
            outcome: outcomeTypes[Math.floor(Math.random() * outcomeTypes.length)],
        });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
}

function gen(id, name, riskBase, diagnosisKey) {
    const diagnosis = diagnosisKey;
    const tier = tierMap[diagnosis];
    const risk = Math.min(0.99, Math.max(0.05, riskBase + (Math.random() - 0.5) * 0.08));
    const velocity = tier === "Tier 3" ? +(0.08 + Math.random() * 0.12).toFixed(3) : tier === "Tier 2" ? +(0.02 + Math.random() * 0.06).toFixed(3) : +(-0.05 + Math.random() * 0.08).toFixed(3);
    const accel = tier === "Tier 3" ? +(0.005 + Math.random() * 0.01).toFixed(4) : tier === "Tier 2" ? +(-0.002 + Math.random() * 0.004).toFixed(4) : +(-0.01 + Math.random() * 0.005).toFixed(4);
    const riskPct = (Math.random() * 15 - 5).toFixed(1);
    const riskChange = parseFloat(riskPct) >= 0 ? `+${riskPct}%` : `${riskPct}%`;
    const balVal = Math.floor(20000 + Math.random() * 500000);
    const balance = `₹${(balVal / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    const signals = {};
    for (let si = 1; si <= 8; si++) signals[`s${si}`] = +(Math.random()).toFixed(2);
    const nInterventions = Math.floor(Math.random() * 5);
    const daysAgoPayment = tier === "Tier 3" ? Math.floor(15 + Math.random() * 20) : tier === "Tier 2" ? Math.floor(7 + Math.random() * 15) : Math.floor(1 + Math.random() * 10);
    const openYear = 2021 + Math.floor(Math.random() * 4);
    const openMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const openDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');

    return {
        id: `VEC-${id}`,
        loanAccountId: `LA-${id}`,
        name,
        accountType: "loan",
        risk: +risk.toFixed(3),
        riskChange,
        velocity,
        accel,
        balance,
        signals,
        diagnosis,
        tier,
        lastPayment: `${daysAgoPayment} days ago`,
        openedDate: `${openYear}-${openMonth}-${openDay}`,
        history: generateTrend(180, riskBase * 100, tier === "Tier 3" ? 5 : tier === "Tier 2" ? 3 : 2),
        interventions: nInterventions > 0 ? randomInterventions(nInterventions) : [],
        lastProcessedBatchId: "B-2025-02-19-004",
    };
}

// Monitored loan accounts only (platform scope) — 50 accounts
export const mockCustomers = [
    gen(9021, "Aditya Sharma", 0.82, "CRISIS SPIRAL"),
    gen(4432, "Priya Patel", 0.45, "HIDDEN ACCELERATION"),
    gen(1102, "Vikram Singh", 0.75, "STABLE HIGH RISK"),
    gen(8871, "Sanya Malhotra", 0.58, "EARLY WARNING"),
    gen(3310, "Rohan Das", 0.32, "STRONG RECOVERY"),
    gen(5501, "Ananya Iyer", 0.88, "CRISIS SPIRAL"),
    gen(6203, "Rajesh Menon", 0.72, "MANAGED DECLINE"),
    gen(7814, "Deepika Nair", 0.41, "HIDDEN ACCELERATION"),
    gen(2245, "Suresh Reddy", 0.65, "STABLE HIGH RISK"),
    gen(3389, "Kavita Joshi", 0.28, "STRONG RECOVERY"),
    gen(4410, "Mohammed Irfan", 0.91, "CRISIS SPIRAL"),
    gen(5523, "Lakshmi Sundaram", 0.37, "EARLY WARNING"),
    gen(6634, "Amit Verma", 0.79, "MANAGED DECLINE"),
    gen(7745, "Rekha Gupta", 0.53, "MOMENTUM SHIFT"),
    gen(8856, "Nitin Kulkarni", 0.44, "HIDDEN ACCELERATION"),
    gen(9967, "Pooja Deshmukh", 0.86, "CRISIS SPIRAL"),
    gen(1078, "Harish Babu", 0.69, "STABLE HIGH RISK"),
    gen(2189, "Swati Bose", 0.33, "NEUTRAL"),
    gen(3290, "Karthik Raman", 0.25, "STRONG RECOVERY"),
    gen(4301, "Meera Krishnan", 0.57, "EARLY WARNING"),
    gen(5412, "Arjun Tiwari", 0.83, "CRISIS SPIRAL"),
    gen(6523, "Nisha Agarwal", 0.71, "MANAGED DECLINE"),
    gen(7634, "Pranav Hegde", 0.48, "MOMENTUM SHIFT"),
    gen(8745, "Divya Chauhan", 0.39, "HIDDEN ACCELERATION"),
    gen(9856, "Ravi Shankar", 0.62, "STABLE HIGH RISK"),
    gen(1067, "Sunita Devi", 0.90, "CRISIS SPIRAL"),
    gen(2178, "Gaurav Mishra", 0.34, "NEUTRAL"),
    gen(3289, "Anjali Saxena", 0.77, "MANAGED DECLINE"),
    gen(4390, "Manoj Pandey", 0.55, "EARLY WARNING"),
    gen(5401, "Shruti Bhatt", 0.29, "STRONG RECOVERY"),
    gen(6512, "Vishal Kapoor", 0.85, "CRISIS SPIRAL"),
    gen(7623, "Rina Chatterjee", 0.68, "STABLE HIGH RISK"),
    gen(8734, "Ashok Pillai", 0.42, "MOMENTUM SHIFT"),
    gen(9845, "Geeta Rawat", 0.37, "HIDDEN ACCELERATION"),
    gen(1056, "Sanjay Thakur", 0.73, "MANAGED DECLINE"),
    gen(2167, "Pallavi Rao", 0.51, "EARLY WARNING"),
    gen(3278, "Dinesh Choudhary", 0.87, "CRISIS SPIRAL"),
    gen(4389, "Kamala Goswami", 0.31, "STRONG RECOVERY"),
    gen(5490, "Rahul Srivastava", 0.66, "STABLE HIGH RISK"),
    gen(6501, "Tara Jain", 0.46, "MOMENTUM SHIFT"),
    gen(7612, "Bharat Mahajan", 0.93, "CRISIS SPIRAL"),
    gen(8723, "Usha Parekh", 0.60, "MANAGED DECLINE"),
    gen(9834, "Ajay Dwivedi", 0.38, "HIDDEN ACCELERATION"),
    gen(1045, "Neha Banerjee", 0.54, "EARLY WARNING"),
    gen(2156, "Prakash Naik", 0.26, "NEUTRAL"),
    gen(3267, "Radha Mohan", 0.80, "CRISIS SPIRAL"),
    gen(4378, "Santosh Yadav", 0.70, "MANAGED DECLINE"),
    gen(5489, "Jyoti Sharma", 0.43, "HIDDEN ACCELERATION"),
    gen(6500, "Vivek Khanna", 0.35, "STRONG RECOVERY"),
    gen(7611, "Padma Ranganathan", 0.59, "EARLY WARNING"),
];

// Alias: loan accounts (platform monitors only these)
export const loanAccounts = mockCustomers;

// Computed portfolio stats from the 50 accounts
const totalExposure = mockCustomers.reduce((sum, c) => {
    const val = parseFloat(c.balance.replace(/[₹,]/g, ''));
    return sum + val;
}, 0);
const t3Accounts = mockCustomers.filter(c => c.tier === 'Tier 3');
const t2Accounts = mockCustomers.filter(c => c.tier === 'Tier 2');
const t1Accounts = mockCustomers.filter(c => c.tier === 'Tier 1');
const atRiskExposure = t3Accounts.reduce((sum, c) => sum + parseFloat(c.balance.replace(/[₹,]/g, '')), 0);
const avgVelocity = (mockCustomers.reduce((s, c) => s + c.velocity, 0) / mockCustomers.length).toFixed(4);
const avgAccel = (mockCustomers.reduce((s, c) => s + c.accel, 0) / mockCustomers.length).toFixed(4);
const totalInterventions = mockCustomers.reduce((s, c) => s + c.interventions.length, 0);
const successfulInterventions = mockCustomers.reduce((s, c) => s + c.interventions.filter(iv => iv.outcome === 'SUCCESS' || iv.outcome === 'PROMISE_TO_PAY').length, 0);

export const portfolioStats = {
    totalLoanAccounts: 12480,
    monitoredAccounts: mockCustomers.length,
    totalExposure: `₹${(totalExposure / 100000).toFixed(1)} L`,
    atRiskExposure: `₹${(atRiskExposure / 100000).toFixed(1)} L`,
    activeInterventions: totalInterventions,
    successfulInterventions,
    interventionSuccessRate: totalInterventions > 0 ? ((successfulInterventions / totalInterventions) * 100).toFixed(1) : '0.0',
    portfolioVelocity: `+${avgVelocity}`,
    portfolioAccel: `+${avgAccel}`,
    fleetHistory: generateTrend(180, 45, 2),
    lastBatchId: batchProcessor.lastBatchId,
    lastBatchRun: batchProcessor.lastRunAt,
    accountsInLastBatch: batchProcessor.accountsProcessed,

    // Tier distribution for analytics
    tierDistribution: {
        tier3: t3Accounts.length,
        tier2: t2Accounts.length,
        tier1: t1Accounts.length,
    },

    // Diagnosis distribution
    diagnosisDistribution: diagnoses.map(d => ({
        diagnosis: d,
        count: mockCustomers.filter(c => c.diagnosis === d).length,
    })).filter(d => d.count > 0),

    // NPA projection
    npaProjection: {
        current: t3Accounts.length,
        estimated30Days: Math.floor(t3Accounts.length * 1.3 + t2Accounts.filter(c => c.velocity > 0.04).length * 0.5),
        estimated90Days: Math.floor(t3Accounts.length * 1.5 + t2Accounts.length * 0.4),
    },

    // Daily inflow trends (last 7 days)
    dailyTrends: [
        { day: 'Mon', newT3: 3, resolved: 5, interventions: 22 },
        { day: 'Tue', newT3: 5, resolved: 3, interventions: 28 },
        { day: 'Wed', newT3: 2, resolved: 6, interventions: 18 },
        { day: 'Thu', newT3: 4, resolved: 4, interventions: 25 },
        { day: 'Fri', newT3: 6, resolved: 2, interventions: 31 },
        { day: 'Sat', newT3: 1, resolved: 7, interventions: 12 },
        { day: 'Sun', newT3: 2, resolved: 3, interventions: 8 },
    ],

    // Collection efficiency
    collectionEfficiency: {
        current: '87.4%',
        previous: '84.2%',
        delta: '+3.2%',
    },

    // Recovery metrics
    recoveryMetrics: {
        totalRecovered: '₹12.4 L',
        avgRecoveryTime: '18.5 days',
        recoveryRate: '62.3%',
    },

    signalHealth: [
        { signal: 'S1 PayDrift', severity: 0.8, status: 'Critical', trend: '+0.12', desc: 'Payment timing deviation from due dates' },
        { signal: 'S2 Liquidity', severity: 0.6, status: 'Warning', trend: '+0.04', desc: 'Income vs debt obligation strain' },
        { signal: 'S3 Exhaustion', severity: 0.4, status: 'Stable', trend: '-0.02', desc: 'Credit utilization approaching limits' },
        { signal: 'S4 Velocity', severity: 0.7, status: 'Critical', trend: '+0.09', desc: 'Transaction frequency anomalies' },
        { signal: 'S5 Engagement', severity: 0.9, status: 'Critical', trend: '+0.15', desc: 'Digital channel interaction drops' },
        { signal: 'S6 External', severity: 0.3, status: 'Stable', trend: '-0.01', desc: 'Bureau inquiries and third-party activity' },
        { signal: 'S7 CashShift', severity: 0.5, status: 'Stable', trend: '+0.03', desc: 'ATM withdrawal spike vs digital payments' },
        { signal: 'S8 Failure', severity: 0.6, status: 'Warning', trend: '+0.05', desc: 'Bounced auto-debits and standing instructions' }
    ]
};

export const interventionStrategies = [
    { id: 'nudge', name: 'AI Nudge (SMS/WhatsApp)', impact: 0.1, cost: 'Low' },
    { id: 'holiday', name: '30-Day EMI Holiday', impact: 0.4, cost: 'Medium' },
    { id: 'restructure', name: 'Debt Restructuring', impact: 0.6, cost: 'High' },
    { id: 'rm_call', name: 'Executive RM Crisis Call', impact: 0.8, cost: 'Medium' }
];
