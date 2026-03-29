import express from 'express';
import Batch from '../models/Batch.js';

const router = express.Router();

// ─── GET /api/batches ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const batches = await Batch.find().sort({ runAt: -1 }).limit(20);
        res.json({ success: true, data: batches });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/batches/latest ──────────────────────────────────────────
// Returns the most recent completed batch (for Dashboard widget)
router.get('/latest', async (req, res) => {
    try {
        const latest = await Batch.findOne({ status: 'COMPLETED' }).sort({ runAt: -1 });
        res.json({ success: true, data: latest });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── POST /api/batches ────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const batch = await Batch.create(req.body);
        res.status(201).json({ success: true, data: batch });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ─── PATCH /api/batches/:batchId ─────────────────────────────────────
router.patch('/:batchId', async (req, res) => {
    try {
        const batch = await Batch.findOneAndUpdate(
            { batchId: req.params.batchId },
            { $set: req.body },
            { new: true }
        );
        if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
        res.json({ success: true, data: batch });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

export default router;
