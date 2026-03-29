import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import setupKafkaAndSockets from './kafkaSocket.js';
import { spawn } from 'child_process';
import path from 'path';
import mongoose from 'mongoose';

// Routes
import accountRoutes from './routes/accounts.js';
import transactionRoutes from './routes/transactions.js';
import batchRoutes from './routes/batches.js';

// ─── Load environment variables ───────────────────────────────────────
dotenv.config();

// ─── Connect to MongoDB ───────────────────────────────────────────────
connectDB();

// ─── Express app setup ────────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

const FRONTEND_URL = process.env.NODE_ENV === 'production'
    ? 'https://your-deployed-frontend.com'
    : 'http://localhost:5173';

// Middleware
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Socket.io
const io = new Server(httpServer, {
    cors: { origin: FRONTEND_URL, credentials: true }
});

// Setup Kafka consumer to emit events through io
setupKafkaAndSockets(io);

// ─── API Routes ───────────────────────────────────────────────────────
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/batches', batchRoutes);

// KAFKA TRIGGER ENDPOINT
let pythonWorkersStatus = 'stopped';
app.post('/api/pipeline/start', (req, res) => {
    const basePath = path.resolve('../../prod');
    const pythonCmd = 'python3'; 
    
    if (pythonWorkersStatus === 'stopped') {
        const workerProc = spawn(pythonCmd, ['pipeline_microservice/workers.py'], { cwd: basePath });
        pythonWorkersStatus = 'running';
        console.log('⚡ Starting Python pipeline consumer workers...');
        workerProc.stdout.on('data', d => console.log('WORKERS:', d.toString()));
        workerProc.stderr.on('data', d => console.error('WORKERS ERROR:', d.toString()));
    }
    
    console.log('⚡ Instructing Python producer to stream DB -> Kafka');
    spawn(pythonCmd, ['pipeline_microservice/kafka_producer.py'], { cwd: basePath });
    
    res.json({ success: true, message: 'Kafka pipeline engaged. Streaming transactions to ledger.' });
});

// GENAI REPORT ENDPOINT
app.get('/api/reports/genai/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const customer = await mongoose.connection.db.collection('customers').findOne({ account_id: accountId });
        if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

        const data = customer.latest_prediction || {}; 
        if (!data.final_risk_score && data.final_risk_score !== 0) {
            return res.json({ success: false, message: 'No prediction data exists' });
        }

        const h_score = (data.historian_score || 0) * 100;
        const b_score = (data.behavioral_score || 0) * 100;
        const archetype = data.stress_archetype || 'STABLE_EQUILIBRIUM';
        const kinematics = { 
            velocity: data.velocity || 0, 
            acceleration: data.acceleration || 0, 
            zone: data.zone || 'Z5' 
        };
        const shap = data.signals?.shap_explanations || [];
        const zone = kinematics.zone || 'Z5';

        const zoneStrategies = {
            "Z1": { tone: "Praise & Reinforcement", message: "Great job! Your risk is dropping fast and you're building fantastic defensive momentum." },
            "Z2": { tone: "Encouragement", message: "We're seeing steady improvement in your account health. Keep up the consistent habits!" },
            "Z3": { tone: "Supportive Check-in", message: "You're still improving, but it's slowed down a bit. Do you need any help staying on track?" },
            "Z4": { tone: "Reassurance", message: "Stability discovered! You've successfully transitioned from a state of flux to a calm baseline." },
            "Z5": { tone: "Informational", message: "Your account is in perfect equilibrium. We've unlocked some new financial health rewards for you!" },
            "Z6": { tone: "Early Warning", message: "Quick heads-up: we've spotted some emerging volatility. Let's make sure it doesn't turn into a trend." },
            "Z7": { tone: "Empathetic Support", message: "We see risk appearing, but the slide is slowing down. We're here to talk if you need help now." },
            "Z8": { tone: "Urgent Assistance", message: "Immediate support needed. Your risk profile is steadily worsening. Let's look at a plan together." },
            "Z9": { tone: "Crisis Intervention", message: "CRITICAL: Your risk is rising fast and accelerating. Please contact our specialist support team immediately." }
        };

        const strategy = zoneStrategies[zone] || zoneStrategies["Z5"];

        res.json({
            success: true,
            data: {
                metadata: { accountId, engine: "VECTOR_GENAI_V1", tone: strategy.tone, zone },
                analysis: {
                    synthesis: `Customer classified as ${archetype} (${zone}). ${data.diagnosis || ''}`,
                    fusion: `Historian: ${h_score.toFixed(1)}% | Behavioral: ${b_score.toFixed(1)}%`,
                    drivers: shap,
                    trajectory: `v: ${kinematics.velocity.toFixed(4)} | a: ${kinematics.acceleration.toFixed(4)}`
                },
                intervention: { message: strategy.message, action: data.final_risk_score > 0.46 ? 'OUTREACH' : 'MONITOR' }
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── Health check ─────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'VECTOR Terminal API is live',
        version: 'v4.0.2',
        timestamp: new Date().toISOString(),
    });
});

// ─── 404 handler ─────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route ${req.path} not found` });
});

// ─── Global error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// ─── Start server ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`\n🚀  VECTOR API running at http://localhost:${PORT}`);
    console.log(`    Health check: http://localhost:${PORT}/api/health\n`);
});
