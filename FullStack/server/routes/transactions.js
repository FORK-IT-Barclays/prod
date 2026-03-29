import express from 'express';
import { Transaction } from '../models/Transaction.js';
import { getCustomerName } from '../utils/nameGenerator.js';

const router = express.Router();

function mapTx(txRecord, accId, index) {
    const isCredit = txRecord.credit_amount > 0;
    const amount = isCredit ? txRecord.credit_amount : txRecord.debit_amount;
    
    // Parse "DD/MM/YYYY" to Date
    let dateStr = txRecord.transaction_date;
    let parts = (dateStr || "").split('/');
    let timestamp = new Date();
    if(parts.length === 3) {
        timestamp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
        // Add artificial time to avoid exact same timestamp for all
        timestamp.setSeconds(timestamp.getSeconds() + index);
    }

    return {
        id: `TXN-${accId}-${index}`,
        timestamp: timestamp,
        accountId: accId,
        accountName: getCustomerName(accId),
        accountTier: 'Tier 1',
        type: txRecord.transaction_type || 'UNKNOWN',
        channel: txRecord.transaction_type || 'UNKNOWN',
        status: 'COMPLETED',
        merchant: txRecord.description || 'N/A',
        amount: amount || 0,
        isCredit: isCredit,
        riskScore: 0
    };
}

router.get('/', async (req, res) => {
    try {
        const collections = await Transaction.find().lean();
        let allTxns = [];
        
        for (let col of collections) {
            const accId = col.account_id;
            if (col.transactions && Array.isArray(col.transactions)) {
                allTxns.push(...col.transactions.map((tx, idx) => mapTx(tx, accId, idx)));
            }
        }

        allTxns.sort((a, b) => b.timestamp - a.timestamp);

        res.json({
            success: true,
            data: allTxns,
            pagination: {
                total: allTxns.length,
                page: 1,
                limit: allTxns.length,
                pages: 1,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/stats', async (req, res) => {
    try {
        const collections = await Transaction.find().lean();
        let allTxns = [];
        for (let col of collections) {
            const accId = col.account_id;
            if (col.transactions && Array.isArray(col.transactions)) {
                allTxns.push(...col.transactions.map((tx, idx) => mapTx(tx, accId, idx)));
            }
        }
    
        let totalCount = allTxns.length;
        let totalAmount = 0;
        let statusBreakdownMap = {};
        let typeBreakdownMap = {};

        for (let t of allTxns) {
            totalAmount += t.amount;
            statusBreakdownMap[t.status] = (statusBreakdownMap[t.status] || 0) + 1;
            typeBreakdownMap[t.type] = (typeBreakdownMap[t.type] || 0) + 1;
        }

        res.json({
            success: true,
            data: {
                statusBreakdown: Object.keys(statusBreakdownMap).map(k => ({ _id: k, count: statusBreakdownMap[k] })),
                typeBreakdown: Object.keys(typeBreakdownMap).map(k => ({ _id: k, count: typeBreakdownMap[k] })),
                summary: {
                    totalCount,
                    totalAmount,
                    avgAmount: totalCount > 0 ? totalAmount / totalCount : 0,
                    avgRisk: 0
                },
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/:txId', async (req, res) => {
    res.json({ success: false, message: 'Not implemented' });
});

router.post('/', async (req, res) => {
    res.status(201).json({ success: true, data: req.body });
});

export default router;
