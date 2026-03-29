/**
 * VECTOR Terminal — Database Seeder
 * Run with: node seed.js
 * Seeds MongoDB with all mock loan accounts, transactions, and batches.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LoanAccount from '../models/LoanAccount.js';
import Transaction from '../models/Transaction.js';
import Batch from '../models/Batch.js';

dotenv.config();

// ─── Helpers ─────────────────────────────────────────────────────────
const generateTrend = (points, startValue, volatility) => {
    let trend = [startValue];
    for (let i = 1; i < points; i++) {
        const change = (Math.random() - 0.5) * volatility;
        let next = trend[i - 1] + change;
        next = Math.max(10, Math.min(95, next));
        trend.push(next);
    }
    return trend;
};

const randomDate = (startDaysAgo, endDaysAgo) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * (startDaysAgo - endDaysAgo) + endDaysAgo));
    return d.toISOString().split('T')[0];
};

const interventionTypes = ['SMS_NUDGE', 'AUTO_RESTRUCTURE_OFFER', 'RM_CALL', 'EMAIL_ALERT', 'WHATSAPP_NUDGE', 'EMI_HOLIDAY_OFFER'];
const outcomeTypes = ['NO_RESPONSE', 'PENDING', 'PROMISE_TO_PAY', 'SUCCESS', 'DECLINED', 'PARTIAL_PAY'];

const tierMap = {
    'CRISIS SPIRAL': 'Tier 3',
    'HIDDEN ACCELERATION': 'Tier 3',
    'MANAGED DECLINE': 'Tier 2',
    'STABLE HIGH RISK': 'Tier 2',
    'EARLY WARNING': 'Tier 1',
    'MOMENTUM SHIFT': 'Tier 1',
    'STRONG RECOVERY': 'Tier 1',
    'NEUTRAL': 'Tier 1',
};

const randomInterventions = (count) => {
    const list = [];
    for (let i = 0; i < count; i++) {
        list.push({
            date: randomDate(60, 1),
            type: interventionTypes[Math.floor(Math.random() * interventionTypes.length)],
            outcome: outcomeTypes[Math.floor(Math.random() * outcomeTypes.length)],
        });
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
};

const gen = (id, name, riskBase, diagnosisKey) => {
    const diagnosis = diagnosisKey;
    const tier = tierMap[diagnosis];
    const risk = Math.min(0.99, Math.max(0.05, riskBase + (Math.random() - 0.5) * 0.08));
    const velocity =
        tier === 'Tier 3' ? +(0.08 + Math.random() * 0.12).toFixed(3)
            : tier === 'Tier 2' ? +(0.02 + Math.random() * 0.06).toFixed(3)
                : +(-0.05 + Math.random() * 0.08).toFixed(3);
    const accel =
        tier === 'Tier 3' ? +(0.005 + Math.random() * 0.01).toFixed(4)
            : tier === 'Tier 2' ? +(-0.002 + Math.random() * 0.004).toFixed(4)
                : +(-0.01 + Math.random() * 0.005).toFixed(4);
    const riskPct = (Math.random() * 15 - 5).toFixed(1);
    const riskChange = parseFloat(riskPct) >= 0 ? `+${riskPct}%` : `${riskPct}%`;
    const balVal = Math.floor(20000 + Math.random() * 500000);
    const balance = `₹${(balVal / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    const signals = new Map();
    for (let si = 1; si <= 8; si++) signals.set(`s${si}`, +(Math.random()).toFixed(2));
    const nInterventions = Math.floor(Math.random() * 5);
    const daysAgoPayment =
        tier === 'Tier 3' ? Math.floor(15 + Math.random() * 20)
            : tier === 'Tier 2' ? Math.floor(7 + Math.random() * 15)
                : Math.floor(1 + Math.random() * 10);
    const openYear = 2021 + Math.floor(Math.random() * 4);
    const openMonth = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
    const openDay = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');

    return {
        id: `VEC-${id}`,
        loanAccountId: `LA-${id}`,
        name,
        accountType: 'loan',
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
        history: generateTrend(180, riskBase * 100, tier === 'Tier 3' ? 5 : tier === 'Tier 2' ? 3 : 2),
        interventions: nInterventions > 0 ? randomInterventions(nInterventions) : [],
        lastProcessedBatchId: 'B-2025-02-19-004',
    };
};

// ─── Account seed data ────────────────────────────────────────────────
const accountSeed = [
    [9021, 'Aditya Sharma', 0.82, 'CRISIS SPIRAL'],
    [4432, 'Priya Patel', 0.45, 'HIDDEN ACCELERATION'],
    [1102, 'Vikram Singh', 0.75, 'STABLE HIGH RISK'],
    [8871, 'Sanya Malhotra', 0.58, 'EARLY WARNING'],
    [3310, 'Rohan Das', 0.32, 'STRONG RECOVERY'],
    [5501, 'Ananya Iyer', 0.88, 'CRISIS SPIRAL'],
    [6203, 'Rajesh Menon', 0.72, 'MANAGED DECLINE'],
    [7814, 'Deepika Nair', 0.41, 'HIDDEN ACCELERATION'],
    [2245, 'Suresh Reddy', 0.65, 'STABLE HIGH RISK'],
    [3389, 'Kavita Joshi', 0.28, 'STRONG RECOVERY'],
    [4410, 'Mohammed Irfan', 0.91, 'CRISIS SPIRAL'],
    [5523, 'Lakshmi Sundaram', 0.37, 'EARLY WARNING'],
    [6634, 'Amit Verma', 0.79, 'MANAGED DECLINE'],
    [7745, 'Rekha Gupta', 0.53, 'MOMENTUM SHIFT'],
    [8856, 'Nitin Kulkarni', 0.44, 'HIDDEN ACCELERATION'],
    [9967, 'Pooja Deshmukh', 0.86, 'CRISIS SPIRAL'],
    [1078, 'Harish Babu', 0.69, 'STABLE HIGH RISK'],
    [2189, 'Swati Bose', 0.33, 'NEUTRAL'],
    [3290, 'Karthik Raman', 0.25, 'STRONG RECOVERY'],
    [4301, 'Meera Krishnan', 0.57, 'EARLY WARNING'],
    [5412, 'Arjun Tiwari', 0.83, 'CRISIS SPIRAL'],
    [6523, 'Nisha Agarwal', 0.71, 'MANAGED DECLINE'],
    [7634, 'Pranav Hegde', 0.48, 'MOMENTUM SHIFT'],
    [8745, 'Divya Chauhan', 0.39, 'HIDDEN ACCELERATION'],
    [9856, 'Ravi Shankar', 0.62, 'STABLE HIGH RISK'],
    [1067, 'Sunita Devi', 0.90, 'CRISIS SPIRAL'],
    [2178, 'Gaurav Mishra', 0.34, 'NEUTRAL'],
    [3289, 'Anjali Saxena', 0.77, 'MANAGED DECLINE'],
    [4390, 'Manoj Pandey', 0.55, 'EARLY WARNING'],
    [5401, 'Shruti Bhatt', 0.29, 'STRONG RECOVERY'],
    [6512, 'Vishal Kapoor', 0.85, 'CRISIS SPIRAL'],
    [7623, 'Rina Chatterjee', 0.68, 'STABLE HIGH RISK'],
    [8734, 'Ashok Pillai', 0.42, 'MOMENTUM SHIFT'],
    [9845, 'Geeta Rawat', 0.37, 'HIDDEN ACCELERATION'],
    [1056, 'Sanjay Thakur', 0.73, 'MANAGED DECLINE'],
    [2167, 'Pallavi Rao', 0.51, 'EARLY WARNING'],
    [3278, 'Dinesh Choudhary', 0.87, 'CRISIS SPIRAL'],
    [4389, 'Kamala Goswami', 0.31, 'STRONG RECOVERY'],
    [5490, 'Rahul Srivastava', 0.66, 'STABLE HIGH RISK'],
    [6501, 'Tara Jain', 0.46, 'MOMENTUM SHIFT'],
    [7612, 'Bharat Mahajan', 0.93, 'CRISIS SPIRAL'],
    [8723, 'Usha Parekh', 0.60, 'MANAGED DECLINE'],
    [9834, 'Ajay Dwivedi', 0.38, 'HIDDEN ACCELERATION'],
    [1045, 'Neha Banerjee', 0.54, 'EARLY WARNING'],
    [2156, 'Prakash Naik', 0.26, 'NEUTRAL'],
    [3267, 'Radha Mohan', 0.80, 'CRISIS SPIRAL'],
    [4378, 'Santosh Yadav', 0.70, 'MANAGED DECLINE'],
    [5489, 'Jyoti Sharma', 0.43, 'HIDDEN ACCELERATION'],
    [6500, 'Vivek Khanna', 0.35, 'STRONG RECOVERY'],
    [7611, 'Padma Ranganathan', 0.59, 'EARLY WARNING'],
];

// ─── Transaction seed generator ───────────────────────────────────────
const txTypes = ['CREDIT', 'DEBIT', 'EMI', 'BOUNCE', 'REVERSAL', 'SETTLEMENT'];
const txChannels = ['UPI', 'NEFT', 'RTGS', 'IMPS', 'AUTO_DEBIT', 'BRANCH', 'ATM'];
const txStatuses = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING', 'FAILED', 'BOUNCED']; // weighted toward SUCCESS
const merchants = ['Swiggy', 'Amazon', 'Flipkart', 'HDFC EMI', 'Big Bazaar', 'PhonePe', 'Google Pay', 'Zomato', 'BookMyShow', 'Reliance Fresh'];

const generateTransactions = (accounts) => {
    const txs = [];
    let txCounter = 1000;
    accounts.forEach(acc => {
        const count = Math.floor(3 + Math.random() * 7);
        for (let i = 0; i < count; i++) {
            const ts = new Date();
            ts.setMinutes(ts.getMinutes() - Math.floor(Math.random() * 1440 * 7));
            txs.push({
                txId: `TX-${txCounter++}`,
                loanAccountId: acc.loanAccountId,
                customerName: acc.name,
                type: txTypes[Math.floor(Math.random() * txTypes.length)],
                channel: txChannels[Math.floor(Math.random() * txChannels.length)],
                amount: Math.floor(500 + Math.random() * 50000),
                currency: 'INR',
                status: txStatuses[Math.floor(Math.random() * txStatuses.length)],
                merchant: merchants[Math.floor(Math.random() * merchants.length)],
                risk: +acc.risk.toFixed(3),
                tier: acc.tier,
                batchId: acc.lastProcessedBatchId,
                timestamp: ts,
            });
        }
    });
    return txs;
};

// ─── Batch seed data ──────────────────────────────────────────────────
const batchSeed = [
    {
        batchId: 'B-2025-02-19-004',
        runAt: new Date('2025-02-19T06:00:00Z'),
        accountsProcessed: 5000,
        batchSize: 5000,
        status: 'COMPLETED',
        nextScheduledRun: new Date('2025-02-19T18:00:00Z'),
    },
    {
        batchId: 'B-2025-02-19-003',
        runAt: new Date('2025-02-19T00:00:00Z'),
        accountsProcessed: 5000,
        batchSize: 5000,
        status: 'COMPLETED',
        nextScheduledRun: new Date('2025-02-19T06:00:00Z'),
    },
    {
        batchId: 'B-2025-02-18-002',
        runAt: new Date('2025-02-18T18:00:00Z'),
        accountsProcessed: 2480,
        batchSize: 5000,
        status: 'COMPLETED',
        nextScheduledRun: new Date('2025-02-19T00:00:00Z'),
    },
];

// ─── Run seeder ───────────────────────────────────────────────────────
const seed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅  Connected to MongoDB');

        // Clear existing data
        await Promise.all([
            LoanAccount.deleteMany({}),
            Transaction.deleteMany({}),
            Batch.deleteMany({}),
        ]);
        console.log('🗑   Cleared existing collections');

        // Seed accounts
        const accounts = accountSeed.map(([id, name, risk, diag]) => gen(id, name, risk, diag));
        await LoanAccount.insertMany(accounts);
        console.log(`✅  Seeded ${accounts.length} loan accounts`);

        // Seed transactions (derived from accounts)
        const transactions = generateTransactions(accounts);
        await Transaction.insertMany(transactions);
        console.log(`✅  Seeded ${transactions.length} transactions`);

        // Seed batches
        await Batch.insertMany(batchSeed);
        console.log(`✅  Seeded ${batchSeed.length} batch records`);

        console.log('\n🎉  Database seeded successfully. Closing connection...');
        await mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌  Seed failed:', err);
        process.exit(1);
    }
};

seed();
